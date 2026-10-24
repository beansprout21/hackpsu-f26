# User Flow

```mermaid
flowchart TD
  A[Landing: goals-first one-liner] --> B[Goal intake cards: what, why, when]
  B --> C[Login with Auth0]
  C --> D[Financial snapshot: manual entry or persona prefill]
  D --> E["/api/profile: AI builds Goal Profile (rich life statement)"]
  E --> F["/api/plan: engine scores FNB catalog, AI writes explanations"]
  F --> G[Plan page: allocation, timeline, match cards with trust layer, not-yet card]
  G --> H[Existing customer: open matched FNB product]
  G --> I[New customer: Book with an FNB banker, plan summary copied]
  G -.-> J["P1: Ask why / what if chat (/api/chat)"]
```

| Step | Route | Owner (issue) |
|---|---|---|
| Landing | `/` | Ethan (#8) |
| Intake | `/intake` | Ethan (#9) |
| Login | Auth0 | Ethan (#7) |
| Snapshot | `/snapshot` | Ethan (#10) |
| Goal Profile | `POST /api/profile` | Ben (#4) |
| Match + plan | `POST /api/plan` + engine | Ben (#3, #5) |
| Plan page | `/plan` | Ethan (#11) |
| Chat | `POST /api/chat` + panel | Ben (#6), Ethan (#12) |
