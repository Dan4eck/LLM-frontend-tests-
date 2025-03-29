// Redux imports
import { configureStore, createSlice, createAsyncThunk, combineReducers } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { PersistGate } from 'redux-persist/integration/react';

// React imports
import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import './index.css';


// Mock data for courses
const coursesData = [
  { id: 1, title: 'Machine Learning Fundamentals', price: 99.99, image: 'ml.jpg', category: 'ai' },
  { id: 2, title: 'Advanced React Hooks & Patterns', price: 129.99, image: 'react.jpg', category: 'programming' },
  { id: 3, title: 'Python for Data Science', price: 79.99, image: 'python.jpg', category: 'ai' },
  { id: 4, title: 'Full Stack Web Development', price: 149.99, image: 'fullstack.jpg', category: 'programming' },
  { id: 5, title: 'Neural Networks Deep Dive', price: 119.99, image: 'neural.jpg', category: 'ai' },
  { id: 6, title: 'JavaScript Algorithms', price: 89.99, image: 'js.jpg', category: 'programming' },
];

// Mock promotions
const promotionsData = [
  { id: 1, code: 'REACT25', discount: 0.25, description: '25% off React courses' },
  { id: 2, code: 'BUNDLE15', discount: 0.15, description: '15% off when buying 2+ courses' },
  { id: 3, code: 'AISPECIAL', discount: 0.2, description: '20% off AI courses' },
];

// Async thunk for fetching courses
const fetchCourses = createAsyncThunk(
  'courses/fetchCourses',
  async (_, { rejectWithValue }) => {
    try {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 800));
      return coursesData;
    } catch (error) {
      return rejectWithValue('Failed to fetch courses. Please try again later.');
    }
  }
);

// Async thunk for fetching promotions
const fetchPromotions = createAsyncThunk(
  'promotions/fetchPromotions',
  async (_, { rejectWithValue }) => {
    try {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 600));
      return promotionsData;
    } catch (error) {
      return rejectWithValue('Failed to fetch promotions. Please try again later.');
    }
  }
);

// Cart slice
const cartSlice = createSlice({
  name: 'cart',
  initialState: {
    items: [],
    appliedPromotion: null,
    isCartOpen: false,
  },
  reducers: {
    addToCart: (state, action) => {
      const { id } = action.payload;
      const existingItem = state.items.find(item => item.id === id);
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
      state.isCartOpen = true;
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload);
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(item => item.id === id);
      if (item) {
        item.quantity = Math.max(1, quantity);
      }
    },
    applyPromotion: (state, action) => {
      state.appliedPromotion = action.payload;
    },
    clearPromotion: (state) => {
      state.appliedPromotion = null;
    },
    toggleCart: (state) => {
      state.isCartOpen = !state.isCartOpen;
    }
  },
});

// Courses slice
const coursesSlice = createSlice({
  name: 'courses',
  initialState: {
    list: [],
    status: 'idle',
    error: null,
    filter: 'all'
  },
  reducers: {
    setFilter: (state, action) => {
      state.filter = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourses.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCourses.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchCourses.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

// Promotions slice
const promotionsSlice = createSlice({
  name: 'promotions',
  initialState: {
    list: [],
    status: 'idle',
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPromotions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchPromotions.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.list = action.payload;
      })
      .addCase(fetchPromotions.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

// Redux persist config
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['cart'], // only cart will be persisted
};

// Root reducer
const rootReducer = combineReducers({
  cart: cartSlice.reducer,
  courses: coursesSlice.reducer,
  promotions: promotionsSlice.reducer,
});

// Persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Store
const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

const persistor = persistStore(store);

// Export actions
const { addToCart, removeFromCart, updateQuantity, applyPromotion, clearPromotion, toggleCart } = cartSlice.actions;
const { setFilter } = coursesSlice.actions;

// React components
const App = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={<div className="loading-screen">Loading your cart...</div>} persistor={persistor}>
        <div className="app-container">
          <Header />
          <div className="banner">
            <h1>Master AI & Programming Skills</h1>
            <p>Transform your career with our expert-led courses</p>
          </div>
          <main className="content">
            <CourseList />
            <ShoppingCartSidebar />
          </main>
          <footer className="footer">
            <p>© 2023 LearnTech - Premium AI & Programming Courses</p>
          </footer>
        </div>
      </PersistGate>
    </Provider>
  );
};

const Header = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector(state => state.cart.items);
  const isCartOpen = useSelector(state => state.cart.isCartOpen);
  const itemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  
  return (
    <header className="header">
      <div className="logo">
        <span className="logo-text">LearnTech</span>
      </div>
      <nav className="nav">
        <a href="#" className="nav-link">Home</a>
        <a href="#" className="nav-link">Courses</a>
        <a href="#" className="nav-link">About</a>
        <a href="#" className="nav-link">Contact</a>
      </nav>
      <div className={`cart-icon ${isCartOpen ? 'active' : ''}`} onClick={() => dispatch(toggleCart())}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M0 0h24v24H0z" fill="none"/>
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
        {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
      </div>
    </header>
  );
};

const CourseFilters = () => {
  const dispatch = useDispatch();
  const currentFilter = useSelector(state => state.courses.filter);
  
  return (
    <div className="course-filters">
      <button 
        className={`filter-btn ${currentFilter === 'all' ? 'active' : ''}`}
        onClick={() => dispatch(setFilter('all'))}
      >
        All Courses
      </button>
      <button 
        className={`filter-btn ${currentFilter === 'ai' ? 'active' : ''}`}
        onClick={() => dispatch(setFilter('ai'))}
      >
        AI Courses
      </button>
      <button 
        className={`filter-btn ${currentFilter === 'programming' ? 'active' : ''}`}
        onClick={() => dispatch(setFilter('programming'))}
      >
        Programming
      </button>
    </div>
  );
};

const CourseList = () => {
  const dispatch = useDispatch();
  const courses = useSelector(state => state.courses.list);
  const status = useSelector(state => state.courses.status);
  const error = useSelector(state => state.courses.error);
  const filter = useSelector(state => state.courses.filter);
  
  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCourses());
    }
  }, [status, dispatch]);
  
  const filteredCourses = filter === 'all' 
    ? courses 
    : courses.filter(course => course.category === filter);
  
  if (status === 'loading') {
    return (
      <div className="course-list">
        <CourseFilters />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading amazing courses for you...</p>
        </div>
      </div>
    );
  }
  
  if (status === 'failed') {
    return (
      <div className="course-list">
        <CourseFilters />
        <div className="error-container">
          <p>{error}</p>
          <button onClick={() => dispatch(fetchCourses())}>Try Again</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="course-list">
      <h2>Available Courses</h2>
      <CourseFilters />
      
      {filteredCourses.length === 0 ? (
        <p className="no-courses">No courses found. Try a different filter.</p>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map(course => (
            <CourseItem key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
};

const CourseItem = ({ course }) => {
  const dispatch = useDispatch();
  const cartItems = useSelector(state => state.cart.items);
  const isInCart = cartItems.some(item => item.id === course.id);
  
  const handleAddToCart = () => {
    dispatch(addToCart(course));
  };
  
  return (
    <div className="course-item">
      <div className="course-badge">{course.category === 'ai' ? 'AI' : 'DEV'}</div>
      <div className="course-image">
        <div className="image-placeholder" style={{ backgroundColor: course.category === 'ai' ? '#4a6fa5' : '#6b4a4a' }}>
          {course.title.substring(0, 2)}
        </div>
      </div>
      <div className="course-content">
        <h3 className="course-title">{course.title}</h3>
        <div className="course-meta">
          <span className="course-rating">
            ★★★★☆ 4.5
          </span>
          <span className="course-students">423 students</span>
        </div>
        <div className="course-price">${course.price.toFixed(2)}</div>
        <button 
          className={`course-btn ${isInCart ? 'in-cart' : ''}`}
          onClick={handleAddToCart}
          disabled={isInCart}
        >
          {isInCart ? 'Added to Cart' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

const ShoppingCartSidebar = () => {
  const isCartOpen = useSelector(state => state.cart.isCartOpen);
  
  if (!isCartOpen) {
    return null;
  }
  
  return (
    <div className="cart-sidebar">
      <ShoppingCart />
    </div>
  );
};

const ShoppingCart = () => {
  const dispatch = useDispatch();
  const cartItems = useSelector(state => state.cart.items);
  const appliedPromotion = useSelector(state => state.cart.appliedPromotion);
  const promotions = useSelector(state => state.promotions.list);
  const promotionsStatus = useSelector(state => state.promotions.status);
  const promotionsError = useSelector(state => state.promotions.error);
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  
  useEffect(() => {
    if (promotionsStatus === 'idle') {
      dispatch(fetchPromotions());
    }
  }, [promotionsStatus, dispatch]);
  
  const handleCloseCart = () => {
    dispatch(toggleCart());
  };
  
  const handleRemoveItem = (id) => {
    dispatch(removeFromCart(id));
  };
  
  const handleUpdateQuantity = (id, quantity) => {
    dispatch(updateQuantity({ id, quantity }));
  };
  
  const handleApplyPromotion = () => {
    setPromoError('');
    if (!promoCode.trim()) {
      setPromoError('Please enter a promo code');
      return;
    }
    
    const promotion = promotions.find(p => p.code === promoCode.toUpperCase());
    
    if (!promotion) {
      setPromoError('Invalid promotion code');
      return;
    }
    
    if (promotion.code === 'BUNDLE15' && cartItems.length < 2) {
      setPromoError('This promotion requires at least 2 courses');
      return;
    }
    
    if (promotion.code === 'AISPECIAL' && !cartItems.some(item => item.category === 'ai')) {
      setPromoError('This promotion requires at least one AI course');
      return;
    }
    
    dispatch(applyPromotion(promotion));
    setPromoCode('');
  };
  
  const handleClearPromotion = () => {
    dispatch(clearPromotion());
  };
  
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  let discount = 0;
  if (appliedPromotion) {
    discount = subtotal * appliedPromotion.discount;
  }
  
  const total = subtotal - discount;
  
  if (cartItems.length === 0) {
    return (
      <div className="shopping-cart">
        <div className="cart-header">
          <h2>Your Shopping Cart</h2>
          <button className="close-cart" onClick={handleCloseCart}>×</button>
        </div>
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <p>Your cart is empty</p>
          <p className="empty-cart-message">Browse our courses and start learning!</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="shopping-cart">
      <div className="cart-header">
        <h2>Your Shopping Cart</h2>
        <button className="close-cart" onClick={handleCloseCart}>×</button>
      </div>
      
      <div className="cart-items">
        {cartItems.map(item => (
          <div key={item.id} className="cart-item">
            <div className="item-image">
            <div className="item-image">
              <div className="image-placeholder" style={{ backgroundColor: item.category === 'ai' ? '#4a6fa5' : '#6b4a4a' }}>
                {item.title ? item.title.substring(0, 2) : '??'}
              </div>
            </div>
            </div>
            <div className="item-actions">
              <div className="quantity-control">
                <button 
                  className="quantity-btn" 
                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)} 
                  disabled={item.quantity <= 1}
                >
                  −
                </button>
                <span className="quantity">{item.quantity}</span>
                <button 
                  className="quantity-btn" 
                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                >
                  +
                </button>
              </div>
              <button className="remove-btn" onClick={() => handleRemoveItem(item.id)}>
                <span className="remove-icon">🗑</span>
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="promotion-section">
        <h3>Promotions</h3>
        {promotionsStatus === 'loading' && <p className="loading-text">Loading promotions...</p>}
        {promotionsStatus === 'failed' && <p className="error-text">{promotionsError}</p>}
        
        {appliedPromotion ? (
          <div className="applied-promotion">
            <div className="promo-info">
              <span className="promo-code">{appliedPromotion.code}</span>
              <span className="promo-description">{appliedPromotion.description}</span>
            </div>
            <button className="remove-promo-btn" onClick={handleClearPromotion}>×</button>
          </div>
        ) : (
          <div className="promo-input">
            <input 
              type="text" 
              placeholder="Enter promo code" 
              value={promoCode} 
              onChange={(e) => setPromoCode(e.target.value)} 
            />
            <button onClick={handleApplyPromotion}>Apply</button>
            {promoError && <div className="promo-error">{promoError}</div>}
          </div>
        )}
        
        <div className="available-promos">
          <p className="promo-hint">Available codes: REACT25, BUNDLE15, AISPECIAL</p>
        </div>
      </div>
      
      <div className="cart-summary">
        <div className="summary-row">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        {discount > 0 && (
          <div className="summary-row discount">
            <span>Discount:</span>
            <span>−${discount.toFixed(2)}</span>
          </div>
        )}
        
        <div className="summary-row total">
          <span>Total:</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
      
      <button className="checkout-btn">
        Proceed to Checkout
        <span className="checkout-arrow">→</span>
      </button>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);