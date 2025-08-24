# Release Check API

## Endpoint: `/api/releases/check`

This API endpoint checks if a driver needs to update their app version based on their context (country, company, driver ID, vehicle ID) and current version.

### Methods

#### POST `/api/releases/check`

**Request Body (JSON):**
```json
{
  "appId": "uuid",
  "country": "string",
  "companyId": "number",
  "driverId": "number", 
  "vehicleId": "number",
  "companyRef": "string",
  "driverRef": "string", 
  "vehicleRef": "string",
  "versionName": "string",
  "versionCode": "number"
}
```

#### GET `/api/releases/check`

**Query Parameters:**
- `appId` (required) - Application UUID
- `country` (required) - Country code (e.g., "IE", "US")
- `companyId` (required) - Company ID number
- `driverId` (required) - Driver ID number
- `vehicleId` (required) - Vehicle ID number
- `companyRef` (optional) - Company reference string
- `driverRef` (optional) - Driver reference string
- `vehicleRef` (optional) - Vehicle reference string
- `versionName` (required) - Current version name (e.g., "1.2.3")
- `versionCode` (required) - Current version code number

### Response

#### Update Required
```json
{
  "updateRequired": true,
  "currentVersion": {
    "versionName": "1.2.3",
    "versionCode": 123
  },
  "latestVersion": {
    "id": "release-uuid",
    "versionName": "1.3.0", 
    "versionCode": 130
  },
  "message": "Update required: 1.3.0 (130) is available"
}
```

#### Update Not Required
```json
{
  "updateRequired": false,
  "currentVersion": {
    "versionName": "1.3.0",
    "versionCode": 130
  },
  "message": "Current version is up to date"
}
```

#### No Releases Available
```json
{
  "updateRequired": false,
  "currentVersion": {
    "versionName": "1.2.3",
    "versionCode": 123
  },
  "message": "No releases available for your context"
}
```

### Error Responses

#### Validation Error (400)
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "appId",
      "message": "Invalid app ID format"
    }
  ]
}
```

#### Server Error (500)
```json
{
  "error": "Internal server error",
  "message": "Failed to check release requirements"
}
```

### Example Usage

#### cURL POST
```bash
curl -X POST http://localhost:3000/api/releases/check \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "9d03314d-ab63-4493-8faa-a648ad65ebc9",
    "country": "IE",
    "companyId": 1100,
    "driverId": 9999,
    "vehicleId": 9999,
    "companyRef": "comp-abc",
    "driverRef": "driver-xyz",
    "vehicleRef": "vehicle-123",
    "versionName": "1.2.0",
    "versionCode": 120
  }'
```

#### cURL GET
```bash
curl "http://localhost:3000/api/releases/check?appId=9d03314d-ab63-4493-8faa-a648ad65ebc9&country=IE&companyId=1100&driverId=9999&vehicleId=9999&companyRef=comp-abc&driverRef=driver-xyz&vehicleRef=vehicle-123&versionName=1.2.0&versionCode=120"
```

### Logic

The API determines if an update is required by:

1. **Finding available releases** for the driver's context using the existing condition matching logic
2. **Comparing version codes** between the driver's current version and the latest available release
3. **Returning update status** with appropriate details

The release matching follows the same logic as the web interface:
- Releases with no conditions are available to all drivers
- Releases with conditions are only available if all conditions match the driver's context
- The highest version code release that matches is considered the "latest available"

```