# OpsDash — Operations Management Platform

## Overview
OpsDash is a role-based operations platform with a React SPA frontend and an Express/PostgreSQL backend. It supports project and issue lifecycle management, approvals, dashboards/analytics, field operations, vendor/PO workflows, QA inspection, RCA/CAPA, and machine/work-order/batch tracking.

The application enforces authentication via JWT and authorization via role-based route guards on both frontend (`ProtectedRoute`) and backend (`rbac` middleware).

## Architecture
- **Frontend (React SPA)**: React Router + React Query + Axios + Recharts + Socket.IO client.
- **Backend (Express API)**: modular route files mounted under `/api/*`, PostgreSQL via `pg` Pool.
- **Database**: PostgreSQL tables accessed with raw SQL (no ORM).
- **Realtime**: Socket.IO emits issue events from backend; frontend listens and invalidates query caches.
- **Uploads**: Multer-backed file uploads under `backend/uploads/defects`, served at `/uploads`.

## Tech Stack (Backend / Frontend / Database / DevOps)
- **Backend**: Node.js, Express, pg, jsonwebtoken, bcryptjs, multer, nodemailer, cors, helmet, express-rate-limit
- **Frontend**: React 18, React Router v6, @tanstack/react-query, Axios, Recharts, Framer Motion, react-hot-toast, react-icons, socket.io-client
- **Database**: PostgreSQL
- **DevOps/Runtime**: npm scripts, nodemon (backend dev), local CORS origins (`http://localhost:3000`, `http://localhost:3001`)

## Project Structure (real folder tree based on what you found)
```text
ops_dashboard/
├─ backend/
│  ├─ controllers/
│  │  ├─ dashboardController.js
│  │  ├─ issueController.js
│  │  └─ projectController.js
│  ├─ middleware/
│  │  ├─ auth.js
│  │  ├─ fieldFilter.js
│  │  ├─ rbac.js
│  │  └─ roles.js
│  ├─ routes/
│  │  ├─ AdminRoutes.js
│  │  ├─ approvalRoutes.js
│  │  ├─ attachmentRoutes.js
│  │  ├─ authRoutes.js
│  │  ├─ batchRoutes.js
│  │  ├─ dashboardRoutes.js
│  │  ├─ fieldRoutes.js
│  │  ├─ inspectionRoutes.js
│  │  ├─ inventoryAlertRoutes.js
│  │  ├─ issueRoutes.js
│  │  ├─ kpiRoutes.js
│  │  ├─ machineRoutes.js
│  │  ├─ poTrackingRoutes.js
│  │  ├─ projectRoutes.js
│  │  ├─ rcaRoutes.js
│  │  ├─ subtaskRoutes.js
│  │  ├─ userRoutes.js
│  │  ├─ vendorRoutes.js
│  │  ├─ workflowRoutes.js
│  │  └─ workOrderRoutes.js
│  ├─ uploads/defects/
│  ├─ db.js
│  ├─ server.js
│  ├─ schema.json
│  ├─ .env
│  └─ package.json
├─ frontend/
│  ├─ src/
│  │  ├─ api/
│  │  ├─ auth/
│  │  ├─ components/
│  │  ├─ pages/
│  │  ├─ app.js
│  │  └─ index.js
│  └─ package.json
└─ README.md
```

## Role & Access Matrix (table: Role | Pages | Permissions)
| Role | Pages (from `frontend/src/app.js`) | Permissions (effective, from frontend + backend RBAC) |
|---|---|---|
| **superadmin** | `/dashboard`, `/projects`, `/projects/:id`, `/issues`, `/issues/:id`, `/approval-queue`, `/users-management`, `/resource-allocation`, `/audit-logs`, `/workflow-builder`, `/work-orders`, `/batch-tracking`, `/vendor-management`, `/po-tracking`, `/defect-analytics`, `/kpi-dashboard`, `/field-service`, `/machines`, `/roadmap`, `/inventory-alerts`, `/kanban/:projectId`, `/sprint-planning/:projectId`, `/capa-management` | Full system administration; exclusive/delete-heavy actions in many backend modules (users, workflows, vendors, inventory alerts, machine/workflow deletes, etc.) |
| **admin** | `/dashboard`, `/projects`, `/projects/:id`, `/issues`, `/issues/new`, `/issues/:id`, `/approval-queue`, `/resource-allocation`, `/work-orders`, `/batch-tracking`, `/vendor-management`, `/po-tracking`, `/defect-analytics`, `/kpi-dashboard`, `/field-service`, `/machines`, `/roadmap`, `/kanban/:projectId`, `/sprint-planning/:projectId`, `/capa-management` | Management actions across projects/issues/approvals/field/PO/vendor/KPI; many create/update operations allowed; limited delete compared to superadmin |
| **developer** | `/dashboard`, `/projects/:id`, `/my-projects`, `/issues`, `/issues/new`, `/issues/:id`, `/my-tasks`, `/roadmap`, `/my-kanban`, `/kanban/:projectId`, `/sprint-planning/:projectId` | Assigned-project operations, issue updates/status transitions, subtasks, selected work-order and machine assignment operations |
| **tester** | `/dashboard`, `/projects/:id`, `/my-projects`, `/issues`, `/issues/:id`, `/my-tasks`, `/qa-queue`, `/approval-queue`, `/roadmap`, `/defect-analytics`, `/capa-management` | QA workflows: defect analytics/classification, approvals participation, inspection checklist, RCA/CAPA actions where route allows tester role |

## Database Schema (table: Table Name | Purpose | Key Columns)
> No migration SQL files were found in the repository (`backend/migrations` absent, no `CREATE TABLE` scripts). The table list below is based on real SQL usage in route/controller code.

| Table Name | Purpose | Key Columns (observed in code) |
|---|---|---|
| `expanded_factissues` | Core issue store | `issueid`, `projectid`, `sprint`, `issuetype`, `status`, `createddate`, `closeddate`, `assigneeteam`, `description`, `machine_id`, `defect_category`, `defect_location` |
| `expanded_factprojects` | Project master data | `projectid`, `projectname`, `status`, `startdate`, `enddate`, `budgetallocated`, `budgetused` |
| `project_assignments` | User-to-project access map | `project_id`, `user_id`, `role_in_project`, `assigned_by` |
| `users` | Auth user records | `id`, `email`, `password`, `role`, `status` |
| `approval_requests` | Approval workflow records | `id`, `issue_id`, `approver_id`, `requested_by`, `comments`, `status`, `resolved_at` |
| `issue_attachments` | Uploaded defect images/files | `id`, `issue_id`, `file_name`, `file_path`, `file_size`, `uploaded_by` |
| `inspection_checklists` | QA inspection checklist items | `id`, `issue_id`, `item_text`, `is_checked`, `created_by` |
| `rca_reports` | Root-cause records | `id`, `issue_id`, `root_cause`, `corrective_action`, `preventive_action`, `created_by` |
| `capa_items` | CAPA tasks linked to RCA | `id`, `rca_id`, `action_item`, `owner`, `target_date`, `status`, `notes`, `created_by` |
| `field_tickets` | Field service ticketing | `id`, `project_id`, `status`, assignment fields |
| `machines` | Machine registry | `id`, metadata columns used by machine endpoints |
| `work_orders` | Work order management | `id`, `projectid`, assignment/status fields |
| `batch_lots` | Batch tracking | `id`, lot metadata/status fields |
| `vendors` | Vendor master | `id`, vendor profile fields |
| `vendor_issues` | Vendor-related issue tracking | `id`, `vendor_id`, issue details/status |
| `purchase_orders` | PO records | `id`, vendor/order/status/value fields |
| `po_status_history` | PO status audit trail | `id`, `po_id`, `status`, timestamps/user |
| `inventory_alert_rules` | Inventory threshold rules | `id`, rule/threshold fields |
| `audit_logs` | Administrative/system audit logs | `id`, event/message/time fields |
| `workflow_templates` | Workflow builder templates | `id`, template JSON/metadata |
| `subtasks` | Issue subtasks | `id`, `issue_id`, `title`, completion fields |
| `issue_defect_details` | Alternate defect classification fallback store | `issue_id`, `defect_category`, `defect_location` |
| `issue_machine_links` | Issue-machine link mapping (referenced) | link columns |
| `change_requests` | Project/sprint/end-date change request flow | `id`, `project_id`, `requested_by`, `field`, `new_value`, `status`, review fields |
| `information_schema.columns` | PostgreSQL metadata read by dashboard schema detection | `table_name`, `column_name` |

## API Endpoints Reference (grouped by module)
> Base API prefix: `http://localhost:5000/api` (frontend Axios config).
>
> **Auth requirement**: all mounted modules use auth middleware except `/api/auth/login` and `/api/auth/register`. Role restriction shown where `rbac(...)` is explicitly applied.

### Auth (`/api/auth`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| POST | `/login` | No | None |
| POST | `/register` | No | None |
| GET | `/users/pending` | Yes | `superadmin`,`admin` |
| PUT | `/users/:id/approve` | Yes | `superadmin`,`admin` |

### Projects (`/api/projects`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/all` | Yes | `admin`,`superadmin` |
| GET | `/my-projects` | Yes | Assigned/authorized user |
| GET | `/users` | Yes | `admin`,`superadmin` |
| POST | `/assign` | Yes | `admin`,`superadmin` |
| POST | `/instant-assign` | Yes | `admin`,`superadmin` |
| PUT | `/approve-sprint-request` | Yes | `admin`,`superadmin` |
| POST | `/` | Yes | `admin`,`superadmin` |
| GET | `/:projectId/stats` | Yes | Authorized user |
| GET | `/:projectId/insights` | Yes | Authorized user |
| POST | `/:projectId/request-change` | Yes | Authenticated user |
| POST | `/:projectId/sprint-request` | Yes | Authenticated user |
| PUT | `/:projectId/budget` | Yes | `admin`,`superadmin` |
| GET | `/:projectId/members` | Yes | Authenticated user |
| GET | `/:projectId` | Yes | Authorized user |
| PUT | `/:projectId` | Yes | `admin`,`superadmin` |
| DELETE | `/:projectId` | Yes | `superadmin` |

### Issues (`/api/issues`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/` | Yes | Role-filtered in controller |
| GET | `/my-tasks` | Yes | Authenticated user |
| GET | `/my-issues` | Yes | Authenticated user |
| GET | `/project/:projectId` | Yes | Assigned or admin/superadmin |
| POST | `/` | Yes | `developer`,`tester`,`admin`,`superadmin` |
| PUT | `/bulk-assign-sprint` | Yes | `admin`,`superadmin` |
| PUT | `/:id/status` | Yes | `developer`,`tester`,`admin`,`superadmin` |
| PUT | `/:id` | Yes | `developer`,`tester`,`admin`,`superadmin` |
| PUT | `/:id/machine` | Yes | `developer`,`admin`,`superadmin` |
| DELETE | `/:id` | Yes | `admin`,`superadmin` |
| GET | `/defect-summary` | Yes | `tester`,`admin`,`superadmin` |
| GET | `/:id` | Yes | Authenticated user |
| PUT | `/:id/defect-classify` | Yes | `tester`,`admin`,`superadmin` |

### Dashboard (`/api/dashboard`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/stats` | Yes | Role-aware payload |
| GET | `/by-status` | Yes | None |
| GET | `/by-type` | Yes | None |
| GET | `/by-sprint` | Yes | None |
| GET | `/by-team` | Yes | None |
| GET | `/trend` | Yes | None |
| GET | `/age-distribution` | Yes | None |
| GET | `/burndown` | Yes | None |
| GET | `/velocity` | Yes | None |
| GET | `/budget` | Yes | None |
| GET | `/resolution-time` | Yes | None |
| GET | `/project-health` | Yes | None |
| GET | `/overdue` | Yes | None |
| GET | `/sla` | Yes | None |
| GET | `/cumulative-trend` | Yes | None |
| GET | `/project-list` | Yes | None |
| GET | `/role-overview` | Yes | None |
| GET | `/charts` | Yes | None |
| GET | `/schema` | Yes | None |

### Users (`/api/users`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/` | Yes | None |
| GET | `/all` | Yes | None |
| GET | `/:id/projects` | Yes | None |
| PUT | `/:id/role` | Yes | None |
| PUT | `/:id/status` | Yes | None |

### Admin (`/api/admin`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/system-health` | Yes | `superadmin` (route-level) |
| GET | `/audit-logs` | Yes | `superadmin` (route-level) |
| GET | `/all-users` | Yes | `superadmin` (route-level) |

### Approvals (`/api/approvals`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| POST | `/` | Yes | None |
| GET | `/my-pending` | Yes | None |
| GET | `/issue/:issueId` | Yes | None |
| PUT | `/:id/approve` | Yes | None |
| PUT | `/:id/reject` | Yes | None |

### Attachments (`/api/attachments`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| POST | `/issue/:issueId` | Yes | `tester`,`developer`,`admin`,`superadmin` |
| GET | `/issue/:issueId` | Yes | None |
| DELETE | `/:id` | Yes | `tester`,`developer`,`admin`,`superadmin` |

### Subtasks (`/api/subtasks`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/issue/:issueId` | Yes | None |
| POST | `/issue/:issueId` | Yes | `developer`,`admin`,`superadmin` |
| PUT | `/:id` | Yes | `developer`,`admin`,`superadmin` |
| DELETE | `/:id` | Yes | `developer`,`admin`,`superadmin` |

### Inspection (`/api/inspection`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/issue/:issueId` | Yes | None |
| POST | `/issue/:issueId` | Yes | `tester`,`admin`,`superadmin` |
| PUT | `/:id/check` | Yes | `tester`,`admin`,`superadmin` |
| PUT | `/:id/uncheck` | Yes | None |
| DELETE | `/:id` | Yes | `tester`,`admin`,`superadmin` |
| GET | `/issue/:issueId/complete` | Yes | None |

### RCA/CAPA (`/api/rca`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/capa/all` | Yes | `tester`,`admin`,`superadmin` |
| GET | `/issue/:issueId` | Yes | None |
| POST | `/issue/:issueId` | Yes | `tester`,`admin`,`superadmin` |
| PUT | `/:id` | Yes | `tester`,`admin`,`superadmin` |
| GET | `/:rcaId/capa` | Yes | None |
| POST | `/:rcaId/capa` | Yes | `tester`,`admin`,`superadmin` |
| PUT | `/capa/:id` | Yes | `tester`,`admin`,`superadmin` |
| DELETE | `/capa/:id` | Yes | `superadmin` |

### Workflows (`/api/workflows`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/` | Yes | None |
| POST | `/` | Yes | `superadmin` |
| PUT | `/:id` | Yes | `superadmin` |
| DELETE | `/:id` | Yes | `superadmin` |

### Work Orders (`/api/work-orders`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/` | Yes | None |
| GET | `/project/:projectId` | Yes | None |
| GET | `/:id` | Yes | None |
| POST | `/` | Yes | `superadmin`,`admin` |
| PUT | `/:id` | Yes | `superadmin`,`admin`,`developer` |
| DELETE | `/:id` | Yes | `superadmin` |

### Batches (`/api/batches`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/` | Yes | None |
| GET | `/:id` | Yes | None |
| POST | `/` | Yes | `superadmin` |
| PUT | `/:id` | Yes | `superadmin`,`admin` |
| DELETE | `/:id` | Yes | `superadmin` |

### Vendors + Purchase Orders (`/api/vendors`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/` | Yes | None |
| POST | `/` | Yes | `superadmin` |
| PUT | `/:id` | Yes | `superadmin` |
| DELETE | `/:id` | Yes | `superadmin` |
| GET | `/:id/issues` | Yes | None |
| POST | `/:id/issues` | Yes | `superadmin`,`admin` |
| PUT | `/issues/:issueId` | Yes | `superadmin`,`admin` |
| GET | `/purchase-orders` | Yes | None |
| POST | `/purchase-orders` | Yes | `superadmin`,`admin` |
| PUT | `/purchase-orders/:id` | Yes | `superadmin`,`admin` |
| DELETE | `/purchase-orders/:id` | Yes | `superadmin` |

### KPI (`/api/kpi`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/cycle-time` | Yes | `superadmin`,`admin` |
| GET | `/team-efficiency` | Yes | `superadmin`,`admin` |
| GET | `/sprint-velocity` | Yes | `superadmin`,`admin` |
| GET | `/open-aging` | Yes | `superadmin`,`admin` |

### Field Service (`/api/field-tickets`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/` | Yes | None |
| GET | `/project/:projectId` | Yes | None |
| POST | `/` | Yes | `admin`,`superadmin` |
| PUT | `/:id` | Yes | `admin`,`superadmin`,`developer` |
| DELETE | `/:id` | Yes | `superadmin` |
| GET | `/:id` | Yes | None |

### Machines (`/api/machines`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/` | Yes | None |
| GET | `/:id/issues` | Yes | None |
| GET | `/:id` | Yes | None |
| POST | `/` | Yes | `admin`,`superadmin` |
| PUT | `/:id` | Yes | `admin`,`superadmin` |
| DELETE | `/:id` | Yes | `superadmin` |

### Inventory Alerts (`/api/inventory-alerts`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/` | Yes | None |
| GET | `/triggered` | Yes | None |
| POST | `/` | Yes | `superadmin` |
| PUT | `/:id` | Yes | `superadmin` |
| DELETE | `/:id` | Yes | `superadmin` |

### PO Tracking (`/api/po-tracking`)
| Method | Path | Auth | Role Restriction |
|---|---|---|---|
| GET | `/` | Yes | None |
| GET | `/:id` | Yes | None |
| GET | `/:id/history` | Yes | None |
| PUT | `/:id/status` | Yes | `superadmin`,`admin` |

## Environment Variables (every key with description, no values)
| Key | Used In | Description |
|---|---|---|
| `PORT` | `backend/server.js` | Backend HTTP port (defaults to `5000`) |
| `JWT_SECRET` | `backend/middleware/auth.js`, `backend/routes/authRoutes.js` | JWT signing/verification key |
| `EMAIL_USER` | `backend/routes/authRoutes.js` | Gmail sender account for approval notifications |
| `EMAIL_PASS` | `backend/routes/authRoutes.js` | Gmail app password for SMTP transport |
| `GOOGLE_CLIENT_ID` | `.env` only | Present in env, no active OAuth flow implementation in backend routes |
| `GOOGLE_CLIENT_SECRET` | `.env` only | Present in env, no active OAuth flow implementation in backend routes |
| `TEST_VAR` | `backend/server.js` | Startup diagnostic variable logged at boot |

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 13+ running locally
- A PostgreSQL user/database matching `backend/db.js` (or update `db.js`)

### Clone & Install
```bash
git clone <your-repo-url>
cd ops_dashboard

# backend
cd backend
npm install

# frontend
cd ..\frontend
npm install
```

### Database Setup
The backend uses a direct `pg` Pool configuration in `backend/db.js`:
- host: `127.0.0.1`
- port: `5432`
- user: `openpg`
- database: `etpl_ops`

Create/update PostgreSQL credentials and schema to match tables referenced in this README.

### Environment Configuration
Create/update `backend/.env` with keys used by code:
```env
PORT=
JWT_SECRET=
EMAIL_USER=
EMAIL_PASS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
TEST_VAR=
```

### Running the Application
```bash
# Terminal 1: backend
cd backend
npm run dev

# Terminal 2: frontend
cd frontend
npm start
```

Frontend: `http://localhost:3000`  
Backend API base: `http://localhost:5000/api`

## Features by Module (grouped by role)
- **SuperAdmin**: user administration, system health/audit, project governance, workflow templates, inventory alert rule management, full operational analytics, machine/vendor/work-order/batch oversight.
- **Admin**: project and issue governance, sprint planning approvals, resource allocation, field service operations, PO/vendor execution, KPI and defect analytics, CAPA oversight.
- **Developer**: assigned project execution, issue updates and kanban workflows, sprint board interactions, subtasks, selected work-order/machine-linked updates.
- **Tester**: QA queue and my tasks, defect analytics + classification, approval participation, inspection checklist workflows, RCA/CAPA updates.

## WebSocket Events
### Backend emits
- `issueCreated` (issue create)
- `issueUpdated` (issue updates, approvals, bulk sprint assign, machine assignment)
- `issueDeleted` (issue deletion)

### Frontend listens (`frontend/src/app.js`)
- `issueCreated`
- `issueUpdated`

On event reception, frontend invalidates:
- `["dashboardCharts"]`
- `["dashboardStats"]`
- `["myIssues"]`
- `["myTasks"]`

## File Upload Configuration
- Upload endpoint: `POST /api/attachments/issue/:issueId`
- Storage: `backend/uploads/defects/`
- Static serving: `GET /uploads/*` via `express.static`
- Allowed mime types: `jpeg`, `jpg`, `png`, `gif`, `webp`
- Max file size: `5 MB`
- DB metadata table: `issue_attachments`

## Security Notes
- **JWT enforcement**: backend auth middleware validates Bearer token and rejects missing/invalid/expired tokens.
- **JWT expiry**: login tokens are issued with `expiresIn: "24h"`.
- **RBAC enforcement**: backend route-level `rbac(...)` checks role; frontend `ProtectedRoute` also enforces allowed roles.
- **CORS**: backend allows only `http://localhost:3000` and `http://localhost:3001`, with credentials enabled.
- **Hardening**: `helmet()` is enabled globally.

## Known Limitations
- No migration scripts/DDL files are present in-repo; schema must be provisioned separately.
- `backend/db.js` uses hardcoded DB connection settings instead of env-driven database config.
- Google OAuth packages and env keys exist, but no active backend Google OAuth route flow is implemented.
- Some frontend API helpers reference endpoints not found in current backend route map (requires harmonization).

## License
No repository-level `LICENSE` file was found.  
`frontend/package.json` declares `MIT`; backend package has no explicit license field.
