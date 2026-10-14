# Wireflows (low fidelity)

There are four core journeys. Screens are boxes and decisions are diamonds. Every screen named here has its full states listed in `requirements.md`.

## 1. Customer books (happy path in bold)

```mermaid
flowchart TD
    A[Home / shared link] --> B[Services]
    B --> C[Service detail sheet]
    C -->|Add tier| D[Cart]
    D --> E{Logged in?}
    E -- No --> F[Login / Sign up inline] --> G
    E -- Yes --> G[Checkout: Where]
    G --> H{Address in active area?}
    H -- No --> H1[Not serviceable message + change address]
    H -- Yes --> I[Checkout: Who — Any / Female / Male]
    I --> J{Quote: eligible professionals?}
    J -- None / outside hours --> J1[Reason + next step, no payment]
    J -- Yes --> K[Review: total + Pay ₹X]
    K --> L[Razorpay: UPI / card / netbanking]
    L --> M{Paid?}
    M -- No --> K1[Payment not completed — try again]
    M -- Yes --> N["/bookings/:id — Finding a professional"]
    N --> O{Accepted within 120 s?}
    O -- No --> O1[No professional — full refund started]
    O -- Yes --> P[Confirmed + live tracking]
```

## 2. Professional receives and does a job

```mermaid
flowchart TD
    A[Dashboard — Online] --> B[Job alert: in-app alarm or push]
    B --> C{Respond within 30 s}
    C -- Decline --> A
    C -- No response --> C1[Offer expired] --> A
    C -- Accept --> D{Won the accept?}
    D -- No --> D1[Job already taken] --> A
    D -- Yes --> E[Job details: route in panel, Call, Navigate]
    E --> F[I've arrived]
    F --> G{Customer reachable?}
    G -- No, after 10 min + 2 calls --> G1[Close as not reachable — no-show fee]
    G -- Yes --> H[Enter OTP]
    H --> I{OTP correct?}
    I -- No, under 5 tries --> H
    I -- 5 wrong --> I1[Locked — admin alerted]
    I -- Yes --> J[Service in progress + timer]
    J --> K[Complete service]
    K --> L[Earnings updated — back to Online]
```

## 3. Customer tracks, shares OTP and finishes

```mermaid
flowchart TD
    A[Confirmed: name, photo, rating, arrival range] --> B[Live map + status tracker]
    B --> C{Location fresh?}
    C -- No update for 45 s --> C1[Location paused · last updated N min ago]
    C1 --> B
    C -- Yes --> D{Professional arrived?}
    D -- Late beyond threshold --> D1[Free cancellation offered + admin alerted]
    D -- Yes --> E[OTP card prominent: share only now]
    E --> F[Service in progress]
    F --> G[Completed: receipt]
    G --> H[Rate and review]
    G --> I[Invoice]
```

## 4. Admin intervenes

```mermaid
flowchart TD
    A[Dashboard alert: BK-1234 searching 90 s] --> B[Booking details: timeline]
    B --> C{Eligible professionals nearby?}
    C -- Yes --> D[Send direct offer]
    D --> E{Accepted?}
    E -- Yes --> F[Alert resolves; timeline updated]
    E -- No --> C
    C -- No --> G[Cancel with refund preview]
    G --> H[Refund started; customer emailed; audit logged]
```
