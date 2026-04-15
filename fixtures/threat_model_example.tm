@type     tm
@name     E-Commerce Platform Threat Model
@version  1.0
@date     2026-04-14
@author   Security Team
@theme    dark

# References to elements declared in other diagrams
@ref  integration_example.id

# ── Trust boundaries ──────────────────────────────────────────────────────────

boundary internet [label:"Internet (Untrusted)"]
  ref customer_browser
end

boundary frontend [label:"Frontend Zone"]
  ref web_app
  ref load_balancer
end

boundary app_tier [label:"Application Tier"]
  ref order_service
  ref payment_service
  ref notification_service
end

boundary data_tier [label:"Data Tier"]
  ref order_db
  ref payment_db
  ref message_queue
end

# ── Refs not assigned to a boundary ───────────────────────────────────────────

ref external_payment_gateway
ref email_provider

# ── Data flows ─────────────────────────────────────────────────────────────────

flow f1  customer_browser      -> load_balancer           [label:"HTTPS"]
flow f2  load_balancer         -> web_app                 [label:"HTTP"]
flow f3  web_app               -> order_service           [label:"REST"]
flow f4  order_service         -> order_db                [label:"SQL"]
flow f5  order_service         -> message_queue           [label:"AMQP"]
flow f6  message_queue         -> payment_service         [label:"AMQP"]
flow f7  payment_service       -> payment_db              [label:"SQL"]
flow f8  payment_service       -> external_payment_gateway [label:"REST/TLS"]
flow f9  notification_service  -> email_provider          [label:"SMTP/TLS"]
flow f10 message_queue         -> notification_service    [label:"AMQP"]

# ── Threats ────────────────────────────────────────────────────────────────────

# Spoofing
threat T1  [stride:S]  f1            : "Attacker impersonates a legitimate customer session"
threat T2  [stride:S]  external_payment_gateway : "Rogue payment gateway intercepts payment flows"

# Tampering
threat T3  [stride:T]  f3            : "Injection attack on order service REST endpoint"
threat T4  [stride:T]  order_db      : "Direct database access bypasses application logic"

# Repudiation
threat T5  [stride:R]  order_service : "Order actions not logged; user can deny placing order"

# Information Disclosure
threat T6  [stride:I]  f8            : "PAN data exposed in payment API request/response logs"
threat T7  [stride:I]  payment_db    : "Unencrypted PII at rest in payment database"

# Denial of Service
threat T8  [stride:D]  load_balancer : "SYN flood overwhelms load balancer"
threat T9  [stride:D]  message_queue : "Queue flooding blocks order processing"

# Elevation of Privilege
threat T10 [stride:E]  payment_service : "Compromised notification service escalates to payment tier"

# ── Mitigations ───────────────────────────────────────────────────────────────

mitigate T1  : "Enforce short-lived JWT tokens with audience binding; require MFA for checkout"
mitigate T2  : "Pin external gateway TLS certificate; validate response signatures"
mitigate T3  : "Apply strict input validation and parameterised queries on order API"
mitigate T5  : "Emit immutable audit log entry for every order state transition"
mitigate T6  : "Mask PAN in all logs; use tokenisation before persisting payment references"
mitigate T7  : "Encrypt payment_db at rest using AES-256; rotate keys quarterly"
mitigate T8  : "Deploy DDoS scrubbing upstream; configure rate limiting at load balancer"
mitigate T10 : "Apply network segmentation; notification service has no route to payment tier"
