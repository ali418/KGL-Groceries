# KGL Groceries LTD - Management System

A professional web-based management system for KGL Groceries LTD, featuring role-based dashboards, inventory management, sales tracking, and comprehensive business analytics.

## 🏢 Project Overview

KGL Groceries LTD Management System is a comprehensive web application designed to streamline grocery store operations, inventory management, sales tracking, and financial monitoring. The system provides role-based access control with different interfaces for Directors, Managers, and Sales Agents.

## ✨ Features

### 🔐 Authentication & Authorization
- **Role-Based Access Control (RBAC)**
- JWT-based authentication
- Secure login system with session management
- Permission-based navigation and functionality

### 📊 Dashboard Analytics
- **Director Dashboard**: Comprehensive overview with all system metrics
- **Manager Dashboard**: Branch-focused analytics and reports
- **Sales Dashboard**: Real-time sales tracking and performance metrics

### 📦 Inventory Management
- **Inventory Overview**: Complete stock visibility across all branches
- **Stock Control**: Real-time stock tracking, low stock alerts
- **Procurement Management**: Supplier management, purchase orders, procurement analytics
- **Product Pricing**: Dynamic pricing management, margin analysis

### 💰 Financial Management
- **Sales Reports**: Detailed sales analytics, trends, and performance metrics
- **Credit Exposure**: Customer credit management, risk assessment, overdue tracking
- **Revenue Analytics**: Income tracking, profit analysis, financial forecasting

### 👥 Human Resources
- **User Management**: Employee management, role assignment, access control
- **Agent Management**: Sales agent performance tracking, commission management
- **Branch Management**: Multi-branch operations and oversight

### 📈 Data Visualization
- Interactive charts using Chart.js
- Real-time data updates
- Customizable reporting periods
- Export capabilities for reports

## 🛠️ Technology Stack

### Frontend
- **HTML5** - Semantic markup structure
- **CSS3** - Custom styling with CSS variables for theming
- **Bootstrap 5** - Responsive framework
- **JavaScript (ES6+)** - Interactive functionality
- **Chart.js** - Data visualization and analytics
- **Font Awesome** - Professional iconography

### Backend (Planned)
- **Node.js** - Server runtime
- **Express.js** - Web application framework
- **MongoDB** - NoSQL database
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt** - Password hashing
- **Mongoose** - MongoDB object modeling

## 📁 Project Structure

```
KGL-Groceries/
├── frontend/
│   ├── css/
│   │   └── style.css          # Main stylesheet with custom properties
│   ├── js/
│   │   └── main.js            # Main JavaScript functionality
│   ├── login.html             # Authentication page
│   ├── director_dashboard.html # Director's main dashboard
│   ├── manager_dashboard.html  # Manager's dashboard
│   ├── sales_reports.html     # Sales analytics and reporting
│   ├── credit_exposure.html   # Credit management system
│   ├── inventory_overview.html # Inventory tracking
│   ├── stock_control.html     # Stock management
│   ├── procurement.html       # Purchase and supplier management
│   ├── pricing.html           # Product pricing management
│   ├── agents.html            # Sales agent management
│   └── user_management.html   # User administration
├── backend/                   # Backend implementation (planned)
│   ├── models/               # Database models
│   ├── controllers/          # Business logic
│   ├── routes/               # API endpoints
│   ├── middleware/           # Authentication & validation
│   └── config/               # Configuration files
└── README.md                 # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Web server for hosting (Apache, Nginx, or Node.js)
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ali418/KGL-Groceries.git
   cd KGL-Groceries
   ```

2. **Frontend Setup**
   ```bash
   # Navigate to frontend directory
   cd frontend
   
   # Open index.html in your browser
   # Or serve using a local server
   python -m http.server 8000
   ```

3. **Backend Setup (Future)**
   ```bash
   # Navigate to backend directory
   cd backend
   
   # Install dependencies
   npm install
   
   # Start the server
   npm start
   ```

### Configuration

#### Frontend Configuration
- Update API endpoints in `js/main.js`
- Configure branding colors in `css/style.css` using CSS variables
- Customize dashboard widgets and charts in respective HTML files

#### Environment Variables (Backend)
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/kgl-groceries
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
```

## 🎨 Design System

### Color Palette
- **Primary**: `#2E7D32` (Green)
- **Secondary**: `#FFA000` (Amber)
- **Success**: `#4CAF50`
- **Warning**: `#FFA000`
- **Danger**: `#F44336`
- **Info**: `#2196F3`

### Typography
- **Primary Font**: System UI stack
- **Headings**: Bold weight for emphasis
- **Body**: Regular weight for readability

### Components
- **Cards**: Shadow-based elevation system
- **Buttons**: Consistent sizing and hover states
- **Forms**: Validation states and accessibility
- **Tables**: Responsive design with sorting capabilities
- **Modals**: Professional dialog system

## 🔗 File Interconnections

### Core Files Relationship

#### `style.css` - Central Styling System
- Defines CSS custom properties for theming
- Provides responsive grid system
- Implements component styling (cards, buttons, forms)
- Contains sidebar and navigation styles
- Includes chart container and dashboard layouts

#### `main.js` - Core JavaScript Functionality
- Handles sidebar toggle functionality
- Manages user session and authentication state
- Provides utility functions for data formatting
- Implements chart initialization helpers
- Contains role-based navigation logic

#### HTML Pages Integration
- **Consistent Structure**: All pages follow the same layout pattern
- **Shared Components**: Common sidebar, navbar, and footer
- **Dynamic Content**: JavaScript populates data and charts
- **Responsive Design**: Bootstrap classes ensure mobile compatibility

### Data Flow
1. **Authentication**: User logs in → JWT token stored → Role determined
2. **Navigation**: Role-based sidebar → Page-specific content → Data loading
3. **Charts**: Page load → Chart.js initialization → Data visualization
4. **Forms**: User input → Validation → API submission → Response handling

## 📊 Dashboard Features

### Director Dashboard
- Company-wide sales overview
- Multi-branch performance comparison
- Financial summaries and trends
- User management and system administration
- Comprehensive reporting tools

### Manager Dashboard
- Branch-specific analytics
- Local inventory management
- Team performance tracking
- Regional sales reports
- Operational oversight tools

### Sales Dashboard
- Real-time sales metrics
- Individual performance tracking
- Customer interaction history
- Product performance analysis
- Commission calculations

## 🔒 Security Features

- **Password Hashing**: Bcrypt for secure password storage
- **JWT Authentication**: Stateless authentication tokens
- **Role-Based Access**: Permission-based functionality
- **Input Validation**: Server-side validation for all inputs
- **HTTPS Ready**: Configured for secure communication
- **Rate Limiting**: Protection against brute force attacks

## 📱 Responsive Design

- **Mobile First**: Optimized for small screens
- **Tablet Optimization**: Enhanced tablet experience
- **Desktop Ready**: Full-featured desktop application
- **Cross-Browser**: Compatible with all modern browsers
- **Accessibility**: WCAG 2.1 compliance considerations

## 🔄 Future Enhancements

### Phase 2 - Advanced Features
- Real-time notifications system
- Advanced reporting with data export
- Integration with accounting software
- Mobile application development
- Advanced analytics and ML predictions

### Phase 3 - Enterprise Features
- Multi-language support
- Advanced user permissions
- API for third-party integrations
- Advanced security features
- Performance optimization

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software developed for KGL Groceries LTD. All rights reserved.

## 📞 Support

For technical support or inquiries:
- Email: support@kgl-groceries.com
- Phone: +256 XXX XXX XXX
- Address: Kampala, Uganda

## 🙏 Acknowledgments

- Bootstrap team for the excellent CSS framework
- Chart.js team for powerful data visualization
- Font Awesome for professional icons
- The open-source community for various tools and libraries

---

**Built with ❤️ for KGL Groceries LTD**