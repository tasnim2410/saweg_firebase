---
description: How to set up automatic post deletion after 4 days
---

# Auto-Delete Posts Setup

Posts are automatically deleted after 4 days (96 hours) from creation.

## API Endpoint

The endpoint `/api/posts/auto-delete` handles the deletion:
- Deletes providers older than 4 days
- Deletes merchant goods posts older than 4 days
- Returns count of deleted posts

## Setup Cron Job

### Option 1: Vercel Cron (Recommended for Vercel deployments)

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/posts/auto-delete",
      "schedule": "0 0 * * *"
    }
  ]
}
```
This runs daily at midnight.

### Option 2: External Cron Service (e.g., cron-job.org)

1. Go to https://cron-job.org
2. Create a new job
3. Set URL to: `https://yourdomain.com/api/posts/auto-delete`
4. Set schedule to run daily

### Option 3: Server Cron (for VPS/Node.js hosting)

Add to crontab:
```bash
0 0 * * * curl -X GET https://yourdomain.com/api/posts/auto-delete
```

### Option 4: GitHub Actions (for testing)

Create `.github/workflows/auto-delete.yml`:
```yaml
name: Auto Delete Old Posts
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
jobs:
  delete:
    runs-on: ubuntu-latest
    steps:
      - run: curl -X GET https://yourdomain.com/api/posts/auto-delete
```

## Manual Trigger

You can manually trigger deletion by visiting:
```
https://yourdomain.com/api/posts/auto-delete
```

## Days Remaining Indicator

The indicator shows on:
- `/admin/providers` - Admin shippers management
- `/admin/merchants-goods-posts` - Admin merchant posts management  
- `/dashboard/my-posts` - User's own shipper posts
- `/dashboard/my-providers` - User's own provider posts

**NOT shown on:** Public listing pages (`/providers`, `/merchant-goods-posts`)

The badge appears as ⏳ with days remaining (e.g., "⏳ 3 days left" or "⏳ منتهي الصلاحية" for expired).
