"""WebAuthn/Passkey authentication API endpoints."""

import json
import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    ResidentKeyRequirement,
    AuthenticatorAttachment,
    PublicKeyCredentialDescriptor,
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier

from app.config import get_settings
from app.services import firestore

router = APIRouter()
settings = get_settings()

# In-memory challenge store (should use Redis/Firestore in production for multi-instance)
# For now, we store challenges in Firestore for persistence
CHALLENGE_EXPIRY_SECONDS = 300  # 5 minutes


def get_webauthn_rp_id(request: Request) -> str:
    """Get WebAuthn RP ID from request headers or fall back to settings."""
    if settings.environment == "production":
        # In production, extract from Host header
        host = request.headers.get("host", "")
        # Remove port if present
        return host.split(":")[0]
    return settings.webauthn_rp_id


def get_webauthn_origin(request: Request) -> str:
    """Get WebAuthn origin from request headers or fall back to settings."""
    if settings.environment == "production":
        # In production, use Origin header or construct from Host
        origin = request.headers.get("origin")
        if origin:
            return origin
        # Fallback: construct from Host header (assume HTTPS in production)
        host = request.headers.get("host", "")
        return f"https://{host}"
    return settings.webauthn_origin


class RegisterStartRequest(BaseModel):
    """Request to start passkey registration."""
    user_id: str  # Current anonymous user ID (UUID)
    username: Optional[str] = None  # Display name for the credential (optional)


class RegisterFinishRequest(BaseModel):
    """Request to complete passkey registration."""
    user_id: str
    credential: dict  # The credential response from browser


class LoginStartRequest(BaseModel):
    """Request to start passkey login."""
    pass  # No data needed, browser will prompt for passkey


class LoginFinishRequest(BaseModel):
    """Request to complete passkey login."""
    credential: dict  # The credential response from browser


class AuthResponse(BaseModel):
    """Response after successful auth."""
    user_id: str
    username: Optional[str]
    message: str


@router.post("/auth/register/start")
async def register_start(request: RegisterStartRequest, http_request: Request):
    """
    Start passkey registration.
    Returns WebAuthn options for the browser to create a credential.
    """
    # Verify user exists
    user = firestore.get_or_create_user(request.user_id)
    username = request.username or user.get("username") or f"Player-{request.user_id[:6]}"

    # Check if user already has credentials
    existing_creds = firestore.get_user_credentials(request.user_id)
    exclude_credentials = [
        PublicKeyCredentialDescriptor(id=bytes.fromhex(cred["credential_id"]))
        for cred in existing_creds
    ]

    # Generate registration options
    options = generate_registration_options(
        rp_id=get_webauthn_rp_id(http_request),
        rp_name=settings.webauthn_rp_name,
        user_id=request.user_id.encode(),
        user_name=username,
        user_display_name=username,
        exclude_credentials=exclude_credentials,
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.PLATFORM,
            resident_key=ResidentKeyRequirement.REQUIRED,
            user_verification=UserVerificationRequirement.REQUIRED,
        ),
        supported_pub_key_algs=[
            COSEAlgorithmIdentifier.ECDSA_SHA_256,
            COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
        ],
    )

    # Store challenge for verification
    firestore.store_auth_challenge(
        request.user_id,
        options.challenge.hex(),
        "registration",
    )

    # Update username if provided
    if request.username:
        firestore.update_username(request.user_id, request.username)

    return json.loads(options_to_json(options))


@router.post("/auth/register/finish", response_model=AuthResponse)
async def register_finish(request: RegisterFinishRequest, http_request: Request):
    """
    Complete passkey registration.
    Verifies the credential and stores it.
    """
    # Get stored challenge
    challenge_data = firestore.get_auth_challenge(request.user_id)
    if not challenge_data or challenge_data.get("type") != "registration":
        raise HTTPException(status_code=400, detail="No pending registration")

    challenge = bytes.fromhex(challenge_data["challenge"])

    try:
        # Verify the registration response
        verification = verify_registration_response(
            credential=request.credential,
            expected_challenge=challenge,
            expected_rp_id=get_webauthn_rp_id(http_request),
            expected_origin=get_webauthn_origin(http_request),
        )

        # Store the credential
        firestore.store_user_credential(
            user_id=request.user_id,
            credential_id=verification.credential_id.hex(),
            public_key=verification.credential_public_key.hex(),
            sign_count=verification.sign_count,
        )

        # Clear the challenge
        firestore.delete_auth_challenge(request.user_id)

        user = firestore.get_or_create_user(request.user_id)
        return AuthResponse(
            user_id=request.user_id,
            username=user.get("username"),
            message="Passkey registered successfully",
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Registration failed: {str(e)}")


@router.post("/auth/login/start")
async def login_start(request: LoginStartRequest, http_request: Request):
    """
    Start passkey login.
    Returns WebAuthn options for the browser to get a credential.
    """
    # Generate a temporary session ID for this login attempt
    session_id = secrets.token_hex(16)

    # Generate authentication options (discoverable credentials)
    options = generate_authentication_options(
        rp_id=get_webauthn_rp_id(http_request),
        user_verification=UserVerificationRequirement.REQUIRED,
        # Empty allow_credentials = discoverable credential (resident key)
    )

    # Store challenge with session ID
    firestore.store_auth_challenge(
        session_id,
        options.challenge.hex(),
        "authentication",
    )

    response = json.loads(options_to_json(options))
    response["sessionId"] = session_id
    return response


@router.post("/auth/login/finish", response_model=AuthResponse)
async def login_finish(request: LoginFinishRequest, http_request: Request):
    """
    Complete passkey login.
    Verifies the credential and returns the user's passkey.
    """
    session_id = request.credential.get("sessionId")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session ID")

    # Get stored challenge
    challenge_data = firestore.get_auth_challenge(session_id)
    if not challenge_data or challenge_data.get("type") != "authentication":
        raise HTTPException(status_code=400, detail="No pending login")

    challenge = bytes.fromhex(challenge_data["challenge"])

    # Find the credential in our database
    credential_id_hex = request.credential.get("id", "")

    # Convert base64url to hex for lookup
    import base64
    try:
        # The id comes as base64url encoded
        credential_id_bytes = base64.urlsafe_b64decode(credential_id_hex + "==")
        credential_id_hex = credential_id_bytes.hex()
    except Exception:
        pass  # Already hex or invalid

    credential_data = firestore.get_credential_by_id(credential_id_hex)
    if not credential_data:
        raise HTTPException(status_code=400, detail="Credential not found")

    try:
        # Verify the authentication response
        verification = verify_authentication_response(
            credential=request.credential,
            expected_challenge=challenge,
            expected_rp_id=get_webauthn_rp_id(http_request),
            expected_origin=get_webauthn_origin(http_request),
            credential_public_key=bytes.fromhex(credential_data["public_key"]),
            credential_current_sign_count=credential_data["sign_count"],
        )

        # Update sign count
        firestore.update_credential_sign_count(
            credential_data["user_id"],
            credential_id_hex,
            verification.new_sign_count,
        )

        # Clear the challenge
        firestore.delete_auth_challenge(session_id)

        user = firestore.get_or_create_user(credential_data["user_id"])
        return AuthResponse(
            user_id=credential_data["user_id"],
            username=user.get("username"),
            message="Login successful",
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Login failed: {str(e)}")


@router.get("/auth/check/{user_id}")
async def check_passkey_registered(user_id: str):
    """Check if a user has any registered credentials."""
    credentials = firestore.get_user_credentials(user_id)
    return {
        "has_passkey": len(credentials) > 0,
        "credential_count": len(credentials),
    }


class MergeAccountsRequest(BaseModel):
    """Request to merge accounts after passkey login."""
    source_user_id: str  # The local account to merge FROM
    target_user_id: str  # The passkey account to merge INTO


@router.post("/auth/merge")
async def merge_accounts(request: MergeAccountsRequest):
    """
    Merge a local account into the logged-in passkey account.

    Called after a successful passkey login when the user had
    existing progress under a different local account.
    """
    if request.source_user_id == request.target_user_id:
        return {"migrated": False, "reason": "same_account"}

    result = firestore.merge_accounts(
        source_user_id=request.source_user_id,
        target_user_id=request.target_user_id,
    )

    return result
