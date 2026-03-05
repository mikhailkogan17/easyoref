# Monitoring with Better Stack

EasyOref supports sending structured logs to [Better Stack](https://betterstack.com) (Logtail) for cloud monitoring.

## Setup

1. Go to [logs.betterstack.com](https://logs.betterstack.com)
2. Create a new **Source** → choose **Node.js**
3. Copy the **Source Token**
4. Add to your `config.yaml`:
   ```yaml
   observability:
     betterstack_token: "<paste-token-here>"
   ```
5. Restart the bot — you should see:
   ```
   📡 Better Stack Logtail enabled — live tail at logs.betterstack.com
   ```

## What gets logged

| Event                | Level | Details                |
| -------------------- | ----- | ---------------------- |
| Oref poll (quiet)    | debug | status, ms             |
| Oref poll (alerts)   | info  | count, ms, raw payload |
| Alert — not in area  | info  | alert_id, areas        |
| Alert — RELEVANT     | info  | alert_id, type, areas  |
| Cooldown active      | info  | alert_id, type         |
| Telegram sent (GIF)  | info  | type, gif_url          |
| Telegram sent (text) | info  | type                   |
| GIF send failed      | warn  | error, gif_url         |
| Telegram send failed | error | error, type            |
| Heartbeat (30s)      | debug | uptime_s, seen_alerts  |

## Live Tail

Go to **Logs → your source → Live Tail** to see real-time log stream.

## Alerts (optional)

You can set up Better Stack alerts for:
- **Error rate spike** → Telegram / email notification
- **No heartbeat for 5 min** → bot is down
- **Oref fetch failures** → API issues

## Cost

Better Stack free tier: **1 GB/month** — more than enough for EasyOref (< 10 MB/month typical).
