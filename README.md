# ScholarStream Server

This is the **backend API** for ScholarStream — a scholarship management platform.  
It powers authentication, role-based dashboards, scholarship CRUD operations, reviews, and payment flows.

---

## 📖 Description

The ScholarStream server is built with **Node.js + Express** and connects to **MongoDB Atlas** for data storage.  
It provides secure APIs for students, moderators, and admins, including:

- **Scholarship APIs** → create, read, update, delete scholarships.  
- **Review APIs** → students can post reviews and ratings.  
- **Authentication & Authorization** → Firebase authentication with role checks.  
- **Payments** → Stripe integration for scholarship application fees.  
- **Error Handling** → returns proper HTTP codes (403 Forbidden, 404 Not Found, etc.).  


---

## 🛠️ Tech Stack

- **Runtime**: Node.js  
- **Framework**: Express.js  
- **Database**: MongoDB Atlas  
- **Auth**: Firebase Admin SDK  
- **Payments**: Stripe API  
- **Deployment**: Vercel 

---
