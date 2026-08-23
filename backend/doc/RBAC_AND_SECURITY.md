# Security & RBAC Architecture

## 1. Authentication & Tokens
- **Algorithm**: `HS256` HMAC with a secure secret key.
- **Payload**: Standard claims (`sub` = user UUID, `exp` = expiry timestamp, `type` = `"access"`).
- **Password Hashing**: Industry-standard **bcrypt** password hashing with salt.

---

## 2. Dynamic RBAC Engine
The platform uses a data-driven permissions catalog ([app/domain/permissions.py](file:///d:/Ravendra/Personal/Sachin/crm/backend/app/domain/permissions.py)):
- **Permissions**: Granular action keys (e.g. `leads.view_all`, `leads.view_own`, `admin.manage_roles`, `system.manage_settings`).
- **Roles**: Groups of permissions (e.g. `Super Admin`, `Admin`, `Agent`, `Auditor`, `Billing`).
- **Runtime Customization**: Super Administrators can create new roles and assign custom permission combinations without deploying code.

---

## 3. IP Whitelist Security Policy

The system provides defense-in-depth IP security:

1. **System-Wide IP Whitelisting (`security.ip_whitelist_enabled`)**:
   - Managed in System Settings (`app_settings`).
   - Restricts API access and logins to explicitly authorized IPv4, IPv6, or CIDR subnets (`security.allowed_ips`, e.g. `192.168.1.0/24`, `10.0.0.1`).
   - Unauthorized login attempts are rejected with an explicit `403 Forbidden` security restriction message.

2. **Per-User IP Whitelisting (`user.ip_whitelist_enabled`)**:
   - Accounts can individually be locked down to specific client IP addresses stored in `user_whitelisted_ips`.

3. **Superadmin Bypass Guarantee**:
   - Accounts with `super_admin` / `superadmin` role bypass IP restrictions to prevent accidental lockout scenarios.

---

## 4. PII Data Masking & Audit Logging
- **Masking**: Sensitive customer contact numbers and credit card details are masked in standard list and detail views.
- **PII Reveal Logs**: Unmasking or revealing raw card details requires a recorded reason and logs an immutable record in `pii_reveal_logs`.
- **Activity Log**: High-level events (logins, IP blocks, permission edits, user creation) are written to `activity_logs`.
