# Shipment / Import / Sanction Workflows

## New API Endpoints

### Auth
- `POST /api/auth/register` (now accepts `exportCommodities: string[]`)

### Sanctioned List
- `GET /api/sanctioned-list`
- `POST /api/sanctioned-list` (admin)
- `PUT /api/sanctioned-list/:id` (admin)
- `DELETE /api/sanctioned-list/:id` (admin; deactivates)

### Shipment Requests
- `POST /api/shipment-requests` (organization)
- `GET /api/shipment-requests`
- `GET /api/shipment-requests/:id`
- `POST /api/shipment-requests/:id/verify` (operator/admin)
- `POST /api/shipment-requests/:id/approve` (operator/admin)
- `POST /api/shipment-requests/:id/reject` (operator/admin)

### Import Requests
- `POST /api/import-requests` (operator/admin)
- `GET /api/import-requests`
- `GET /api/import-requests/:id`
- `POST /api/import-requests/:id/respond` (organization)
- `GET /api/import-requests/organizations` (operator/admin)
- `GET /api/import-requests/demand-references` (operator/admin)

### Notifications
- `GET /api/notifications`
- `POST /api/notifications/:id/read`

## Key Rules

- Sanctioned requests cannot be approved.
- Shipment request approval requires sanction check first.
- Organization shipment request commodity must be part of `user.exportCommodities`.
- Import request creation validates that selected organization exports the selected commodity.
- Duplicate pending import requests (`organization + commodity`) are blocked.

## WebSocket Notification Events

- Server emits `app_notification` to `user:<userId>` room.
- Frontend listener displays toast and notification center updates via API refresh.
