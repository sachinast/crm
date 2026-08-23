# API Reference — InstaCRM Engine (`/api/v1`)

All endpoints are mounted under `/api/v1` and accept JSON requests. Protected endpoints require a Bearer token in the `Authorization` header:
`Authorization: Bearer <jwt_access_token>`

---

## 1. Authentication (`/auth`)

### `POST /auth/login`
Authenticates a user with email and password.
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "secretpassword"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer"
  }
  ```
- **Error `403 Forbidden`**: Returned if the user's IP is blocked by System IP Whitelisting policy.

---

## 2. Leads Management (`/leads`)

### `GET /leads`
Lists leads with search, filtering, and role-based row visibility.
- **Query Params**: `page`, `page_size`, `search`, `service_type`, `status`, `agent_id`

### `POST /leads`
Creates a new lead intake record.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "phone": "+1 555 019 2831",
    "email": "jane@example.com",
    "service_type": "car",
    "notes": "Interested in SUV rental"
  }
  ```

### `GET /leads/{id}`
Retrieves full lead details, booking status history, and custom field values.

### `PATCH /leads/{id}/status`
Transitions a lead's booking lifecycle status.
- **Request Body**:
  ```json
  {
    "new_status": "client_approved",
    "reason": "Customer approved quote"
  }
  ```

---

## 3. Modality Bookings

### `GET /leads/{id}/car-booking` | `PUT /leads/{id}/car-booking`
Manages car rental reservation details, pickup/return dates, driver info, and fare breakdown.

### `GET /leads/{id}/hotel-booking` | `PUT /leads/{id}/hotel-booking`
Manages hotel reservation properties, room types, stay dates, and guest details.

### `GET /leads/{id}/flight-booking` | `PUT /leads/{id}/flight-booking`
Manages airline ticket PNR, flight numbers, passenger roster, and payment authorization.

---

## 4. Master Data & Admin Management (`/admin`)

### `GET /admin/roles` | `POST /admin/roles`
Catalog of system and custom roles with runtime permission assignment.

### `GET /admin/permissions`
Complete catalog of fine-grained permissions.

### `GET /admin/masters/{field_key}` | `POST /admin/masters/{field_key}`
Manages options across the 24 `mst_*` master database tables.

### `GET /admin/settings` | `PATCH /admin/settings/{key}`
Retrieves and updates system-wide configuration settings (e.g. `security.ip_whitelist_enabled`, `security.allowed_ips`, `header_clocks`).

### `GET /admin/activity`
Audit trail of user logins, role modifications, and system events.

---

## 5. Other Modules
- **`/attendance`**: Staff daily check-in, check-out, and attendance history logs.
- **`/files`**: File manager with secure uploads, metadata, and shareable public links.
- **`/notes`**: Lead-specific and private notes.
- **`/future-credits`**: Customer credit vouchers and validity tracking.
