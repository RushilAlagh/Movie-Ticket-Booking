
# 🎬 Movie Ticket Booking System

A modern, containerized microservices solution for seamless movie ticket bookings.

---

## 📜 System Architecture Diagram

*(Replace with the actual diagram link)*

---

## 🔍 Overview

The **Movie Ticket Booking System** provides an intuitive platform for users to:
- Browse screenings
- Select seats
- Book tickets

Admins can:
- Manage screenings
- View reports via a secure API

---

## 🏗️ Architecture

### Frontend
- **React.js**: Interactive UI with real-time seat availability
- **Axios**: Handles API communication with the backend

### Backend
- **Node.js & Express**: RESTful API for business logic
- **JWT**: Secure authentication

### Data Layer
- **PostgreSQL**: Persistent storage for screenings, bookings, users
- **Redis**: Caches seat availability to reduce database load

### Services
- **RabbitMQ**: Async message queue for booking processing
- **Worker Service**: Processes background tasks (e.g., seat releases)

### Infrastructure
- **Docker**: Containerized services
- **Docker Compose**: Orchestration and local development

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/your-username/movie-ticket-booking.git
   cd movie-ticket-booking
   ```

2. Start all services:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - **Frontend**: [http://localhost:3000](http://localhost:3000)
   - **Backend API**: [http://localhost:8000](http://localhost:8000)

---

## 📚 API Endpoints

| Endpoint                   | Method | Description                     |
|----------------------------|--------|---------------------------------|
| `/screenings/:id/seats`    | GET    | Get available seats for a screening |
| `/bookings`                | POST   | Create a new booking            |
| `/bookings/:id/cancel`     | POST   | Cancel a booking                |
| `/bookings?user_id=:id`    | GET    | List user bookings              |

### Example Requests

#### Get Available Seats
```bash
curl http://localhost:8000/screenings/1/seats
```

#### Create Booking
```bash
curl -X POST http://localhost:8000/bookings \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "screening_id": 1, "seat_ids": [1, 2]}'
```

---

## ✨ Key Features

- ✅ Real-time seat availability with **Redis caching**
- ✅ Containerized microservices for easy scaling
- ✅ Async booking processing via **RabbitMQ**
- ✅ Idempotent API to prevent duplicate bookings
- ✅ Admin dashboard for screening management

---

## 🛠️ Tech Stack

- **Frontend**: React, Redux, Material-UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL, Redis
- **DevOps**: Docker, Docker Compose, GitHub Actions

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit changes:
   ```bash
   git commit -m 'Add some feature'
   ```
4. Push to the branch:
   ```bash
   git push origin feature/your-feature
   ```
5. Open a Pull Request

---

## 📄 License

**MIT** © [Your Name]

---

This revision organizes the content into clear and professional sections, making it more readable and user-friendly. Let me know if you need further adjustments!
