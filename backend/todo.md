
**Important:**  
Do **not** remove or rename existing endpoints, unless absolutely necessary, in the case that they violate software engineering principles. Consult the user if so, at the end of the tasks.  
Only adjust their behavior, enforce permissions, or polish functionality where needed.  
Let the model infer how to map these rules onto the already-existing routes.

---

## 1. Accounts

### Users
- Users can **create**, **read**, **update**, and **delete** **only their own accounts**.

### Responders
- Responders **cannot** create their own accounts.
- Commander creates responder accounts.
- Responders may **read and update only their own accounts**.
- **Deletion** of a responder account can be done **only by a commander**.

### Commanders
- Commanders can **create, read, update, and delete** both:
  - Their **own** commander accounts
  - **Other commanders**' accounts

---

## 2. Teams
- Teams are created **only by a commander**.
- When first created, a team has **no responders**.
- Commander may **assign responders** to a team and **unassign** them.
- Responders **cannot** modify teams; they may **only read** the team they belong to.
- Commander may **delete** a team.
  - When deleted: All responders in that team have their team set to **null**.

---

## 3. Incidents & Disasters

### Incidents
- A **user** can create an incident.
- The incident then appears in the **commander’s view**.
- The user can **only read the incidents they created**.
- Commander can:
  - **Create**, **read**, **update**, and **delete** any incident.
  - **Convert** an incident into a **disaster**.

### Disasters
- Disasters are created by converting an incident.
- When a disaster is created, the system automatically creates its **chat**.
- Commander can:
  - Assign teams to the disaster
  - Unassign teams from the disaster
  - View teams available for assignment
- Teams assigned to a disaster can participate in chat (according to chat rules below).

---

## 4. Tasks
- Tasks can be created **only by the commander**.
- After the commander creates a task and assigns it to a team:
  - The **commander** can see **all tasks**.
  - The **assigned team** can see **its tasks**.
- Commander can **update** all aspects of a task.
- The assigned team can **only mark a task as done**.
- Commander can also update status, including marking done.
- **Only the commander can delete a task**.
- Every task operation (create, update, done, delete) must have a **log entry**.

---

## 5. Surveys
- Surveys do **not** have CRUD.
- A survey “hit” simply:
  1. Selects a question from the **existing question log**.
  2. Lets the user answer it.
  3. Automatically creates a **log entry**.
- If unanswered, the log marks it as **unanswered** and nothing else happens.

---

## 6. Reports
- Reports have full CRUD.
- **Only commanders** may create, read, update, or delete reports.

---

## 7. Chat (Per Disaster)
- Chat is automatically created when a disaster is created.
- Chat is visible to:
  - The **commander**
  - The **logisticians** of teams assigned to the disaster
  - All team members (read-only unless logistician)
- **Create message**:
  - Allowed for **commander** and **logisticians** only.
- **Read messages**:
  - Everyone in assigned teams and the commander.
- **Update/Delete messages**:
  - A user may update/delete **only their own messages**.
  - Commander may delete **any** message.

---

## 8. Logs
- Commander can **create**, **read**, **update**, and **delete** logs manually.
- Tasks and surveys must automatically generate log entries as described above.

---

## Model Instructions
- **Do not remove or rename any existing endpoints.**
- **You are free to create new endpoint names, but keep them consistent with current conventions.**
- Note that your first responsibility is to follow software development principles. You are supposed to notify the user if something implemented currently does not follow them. 
- Preserve system structure; only improve it where needed while respecting all established flows.