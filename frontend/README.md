# MonsterMens90 - Customer Frontend

Modern, fully responsive e-commerce frontend inspired by Bewakoof.com UI/UX.

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable components
│   │   └── layout/         # Navbar, Footer, Layout
│   ├── pages/              # Page components (to be implemented)
│   ├── services/           # API service layer ✅
│   ├── store/              # Zustand state management ✅
│   ├── types/              # TypeScript types ✅
│   ├── utils/              # Utility functions
│   ├── App.tsx             # Main app component ✅
│   └── main.tsx            # Entry point ✅
├── public/                 # Static assets
└── package.json
```

## ✅ Completed Setup

- [x] Folder structure
- [x] API service layer with all contracts
- [x] TypeScript types/interfaces
- [x] Global layout (Navbar + Footer)
- [x] Tailwind CSS configuration
- [x] Zustand stores (Auth + Cart)
- [x] Routing setup

## 📋 Next Steps

1. **Pages Implementation** (In order):
   - Home page
   - Category listing
   - Product detail
   - Cart
   - Checkout
   - Wishlist
   - Auth pages (Login/Signup)
   - User profile & orders

2. **Components**:
   - Product card
   - Image gallery
   - Filters sidebar
   - Quantity selector
   - Address form

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## 🔌 API Integration

All API endpoints are defined in `src/services/api.ts`. The service layer handles:
- Authentication tokens
- Error handling
- Request/response interceptors
- Type safety

## 🎨 Design System

- **Primary Color**: `#ffdc46` (Yellow accent)
- **Background**: White
- **Text**: Dark gray (`#111827`)
- **Font**: Inter, system-ui
- **Spacing**: Tailwind default scale
- **Shadows**: Soft shadows for cards, hover effects

## 📱 Responsive Breakpoints

- Mobile: Default (< 640px)
- Tablet: `sm:` (640px+)
- Desktop: `md:` (768px+)
- Large: `lg:` (1024px+)
- XL: `xl:` (1280px+)
