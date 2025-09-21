# ROSHNI: Disaster Response Coordination Platform

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Scrum](https://img.shields.io/badge/Agile-Scrum-orange)

ROSHNI is a next-generation, data-centric platform designed to empower disaster response teams with real-time intelligence, seamless communication, and predictive analytics. Our mission is to reduce response times, optimize resource allocation, and ultimately save lives during critical incidents.

---

## Table of Contents
- [Key Features](#key-features)
- [Project Documentation](#project-documentation)
- [Development Workflow](#development-workflow)
- [Building and Running with Docker](#building-and-running-with-docker)
- [License](#license)

---

## Key Features (Planned)
- **Real-time Situational Awareness:** A live map UI displaying the location of field responders, resources, and incident reports.
- **Integrated Communication:** In-app call and messaging features to connect teams on the ground with the command center.
- **Predictive Analytics:** ML models trained on meteorological and seismic data to detect disasters.
- **Automated Logging & Reporting:** A summarization system that logs a complete disaster timeline and generates high-level summaries for stakeholders.

---

## Project Documentation
All project planning, requirements, design decisions, and architectural diagrams are stored within the `/docs` directory. This serves as the single source of truth for the "what" and "why" behind our work.
You can access the main documentation hub here: **[./docs/](./docs/)**
The documentation is organized into the following key areas:

| Directory | Description |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **[docs/](./docs/)** | Contains the output of our requirement elicitations, as well as planning procedure for sprints, FRs, NFs, Epics, etc. |
| **[frontend/](./frontend/)** | Contains the React Web-App that handles the frontend. |
| **[backend/](./backend/)** | Contains the FastAPI backend app. |
> **Note:** The living Product Backlog, User Stories, and Sprint Boards will be managed directly in our **[GitHub Issues](https://github.com/202301039/ROSHNI/issues)** and **[GitHub Projects](https://github.com/202301039/ROSHNI/projects)** tabs for real-time tracking.

---

## Development Workflow
This project follows a **Forking Workflow**. All development must be done on a feature branch within your personal fork. When work is complete, a Pull Request must be opened to merge the changes into the `main` branch of this repository.
For a detailed step-by-step guide, please read our **[CONTRIBUTING.md](./CONTRIBUTING.md)** file.

---

## Building and Running with Docker
For containerized development and deployment, use Docker. This runs the frontend, backend, and PostgreSQL database in isolated containers.

### Prerequisites
- Docker and Docker Compose installed (see https://docs.docker.com/get-docker/).

### Steps
1. Build the images:
   ```
   docker compose build
   ```

2. Start the containers:
   ```
   docker compose up -d
   ```
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000 (API docs at /docs)
   - Database: localhost:5432 (user: postgres, pass: postgres, db: disaster_db)

3. Stop the containers:
   ```
   docker compose down
   ```

4. Rebuild after changes:
   ```
   docker compose up --build -d
   ```

5. View logs:
   ```
   docker compose logs -f
   ```

For subproject-specific setup, see `frontend/README.md` and `backend/README.md`.

---

## License
This project is distributed under the MIT License. See `LICENSE.txt` for more information.