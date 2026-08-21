| Endpoint | Test | Expected | Actual | DB Modified? | Result |
|---|---|---|---|---|---|
| POST /api/properties | Reject Negative Purchase Price | VALIDATION_ERROR / 422 | Error: Validation failed for input request payload. | No | **SUCCESS** |
| POST /api/properties | Reject Alphabetic Price Input ("abc") | VALIDATION_ERROR / 422 | Error: Validation failed for input request payload. | No | **SUCCESS** |
| POST /api/units | Reject Invalid Date String ("not-a-date") | VALIDATION_ERROR / 422 | Error: Validation failed for input request payload. | No | **SUCCESS** |
| POST /api/leases | Reject startDate >= endDate | VALIDATION_ERROR / 422 | Error: Validation failed for input request payload. | No | **SUCCESS** |
| POST /api/units | Allow Company A User to create Unit in Company A Property | Success (201) | Success (201) | Yes | **SUCCESS** |
| POST /api/units | Block Company A User from creating Unit in Company B Property | 404 Not Found | Code: 404, Msg: Property not found. | No | **SUCCESS** |
| POST /api/leases | Block Company A User from creating Lease for Company B tenant/unit | 404 Not Found | Code: 404, Msg: Property not found. | No | **SUCCESS** |
| POST /api/tenants | Catch duplicate email constraint and convert to 400 DUPLICATE_EMAIL | 400 / DUPLICATE_EMAIL | Code: 400, Msg: Email address is already registered., ErrorCode: DUPLICATE_EMAIL | No | **SUCCESS** |
