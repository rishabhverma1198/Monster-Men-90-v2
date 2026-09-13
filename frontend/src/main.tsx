import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ErrorBoundary from './components/common/ErrorBoundary'

// Initialize theme before rendering to prevent flash
const initializeTheme = () => {
  const storedTheme = localStorage.getItem('theme-storage');
  if (storedTheme) {
    try {
      const themeData = JSON.parse(storedTheme);
      if (themeData.state?.theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    } catch {
      // If parsing fails, use system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }
  } else {
    // Use system preference if no stored theme
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }
  }
};

// Initialize theme immediately to prevent flash
initializeTheme();

// Check if first visit and redirect to welcome page
const checkFirstVisit = () => {
  const hasVisited = localStorage.getItem('has_visited');
  if (!hasVisited && window.location.pathname === '/') {
    window.history.replaceState(null, '', '/welcome');
  }
};

// Check on load
checkFirstVisit();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
