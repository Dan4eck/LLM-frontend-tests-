// --- index.js ---
import React, { useState, useMemo, useCallback, memo } from 'react';
import { createRoot } from 'react-dom/client';
import { configureStore, createSlice, createSelector } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import { PersistGate } from 'redux-persist/integration/react';
import './index.css';

// --- Mock Data ---
const MOCK_COURSES = [
  { id: 'ai001', title: 'Introduction to Machine Learning', price: 49.99, description: 'Learn the fundamentals of ML algorithms.' },
  { id: 'ai002', title: 'Deep Learning Specialization', price: 89.99, description: 'Master neural networks and deep learning frameworks.' },
  { id: 'prog001', title: 'React - The Complete Guide', price: 59.99, description: 'Build modern web applications with React.' },
  { id: 'prog002', title: 'Python for Data Science', price: 69.99, description: 'Unlock the power of Python for data analysis.' },
  { id: 'prog003', title: 'Advanced JavaScript Concepts', price: 45.00, description: 'Dive deep into JS closures, prototypes, and more.' },
];

// --- Mock Discount API ---
const MOCK_DISCOUNTS = {
  'SUMMER20': { percentage: 0.20, description: '20% off Summer Sale' },
  'WELCOME10': { percentage: 0.10, description: '10% off for new learners' },
};

const fetchDiscount = (code) => {
  return new Promise((resolve, reject) => {
    console.log(`Simulating network request for discount code: ${code}`);
    setTimeout(() => {
      const normalizedCode = code.toUpperCase();
      if (MOCK_DISCOUNTS[normalizedCode]) {
        console.log('Discount found:', MOCK_DISCOUNTS[normalizedCode]);
        resolve({ code: normalizedCode, ...MOCK_DISCOUNTS[normalizedCode] });
      } else {
        console.error('Discount not found.');
        reject(new Error('Invalid discount code.'));
      }
    }, 1000); // Simulate 1 second network delay
  });
};

// --- Redux State Slice (using Redux Toolkit) ---
const initialState = {
  items: {}, // { courseId: { course, quantity } }
  discount: null, // { code, percentage, description }
  discountStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  discountError: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // Action to add an item or increment quantity
    addItem: (state, action) => {
      const course = action.payload;
      const existingItem = state.items[course.id];
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items[course.id] = { course, quantity: 1 };
      }
    },
    // Action to remove an item completely
    removeItem: (state, action) => {
      const courseId = action.payload;
      delete state.items[courseId];
      // Reset discount if cart becomes empty after removal? Optional.
      // if (Object.keys(state.items).length === 0) {
      //   state.discount = null;
      //   state.discountStatus = 'idle';
      //   state.discountError = null;
      // }
    },
    // Action to update the quantity of an item
    updateQuantity: (state, action) => {
      const { courseId, quantity } = action.payload;
      const item = state.items[courseId];
      if (item) {
        const newQuantity = Math.max(0, quantity); // Ensure quantity is not negative
        if (newQuantity === 0) {
          delete state.items[courseId]; // Remove item if quantity is 0
        } else {
          item.quantity = newQuantity;
        }
      }
    },
    // Actions for discount application lifecycle
    applyDiscountStart: (state) => {
      state.discountStatus = 'loading';
      state.discountError = null;
      state.discount = null; // Clear previous discount on new attempt
    },
    applyDiscountSuccess: (state, action) => {
      state.discountStatus = 'succeeded';
      state.discount = action.payload; // { code, percentage, description }
      state.discountError = null;
    },
    applyDiscountFailure: (state, action) => {
      state.discountStatus = 'failed';
      state.discountError = action.payload; // Error message string
      state.discount = null;
    },
    clearCart: (state) => {
        state.items = {};
        state.discount = null;
        state.discountStatus = 'idle';
        state.discountError = null;
    }
  },
});

// Export actions
export const {
  addItem,
  removeItem,
  updateQuantity,
  applyDiscountStart,
  applyDiscountSuccess,
  applyDiscountFailure,
  clearCart,
} = cartSlice.actions;

// --- Async Action Creator (Thunk) for Applying Discount ---
export const applyDiscountCode = (code) => async (dispatch) => {
  if (!code || code.trim() === '') {
    // Optionally dispatch a specific 'idle' or clear state action
     dispatch(applyDiscountFailure('Please enter a discount code.')); // Or handle differently
    return;
  }
  dispatch(applyDiscountStart());
  try {
    const discountData = await fetchDiscount(code);
    dispatch(applyDiscountSuccess(discountData));
  } catch (error) {
    dispatch(applyDiscountFailure(error.message || 'Failed to apply discount.'));
  }
};

// --- Redux Persist Configuration ---
const persistConfig = {
  key: 'root', // Key for localStorage
  storage, // Storage engine (localStorage)
  whitelist: ['cart'], // Only persist the 'cart' slice
};

const persistedReducer = persistReducer(persistConfig, cartSlice.reducer);

// --- Store Configuration ---
const store = configureStore({
  reducer: {
    cart: persistedReducer, // Use the persisted reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types from redux-persist
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }), // RTK includes thunk by default
});

const persistor = persistStore(store); // Create the persistor

// --- Selectors (for optimized state reading) ---
const selectCartState = (state) => state.cart;
const selectCartItems = (state) => selectCartState(state).items;
const selectDiscount = (state) => selectCartState(state).discount;
const selectDiscountStatus = (state) => selectCartState(state).discountStatus;
const selectDiscountError = (state) => selectCartState(state).discountError;

// Memoized selector for cart items array (avoids recreating array if items object hasn't changed deeply)
const selectCartItemsArray = createSelector(
    [selectCartItems],
    (items) => Object.values(items) // Convert items object to array
);

// Memoized selector for calculating totals
const selectCartTotals = createSelector(
  [selectCartItemsArray, selectDiscount],
  (items, discount) => {
    const subtotal = items.reduce((sum, item) => sum + item.course.price * item.quantity, 0);
    let discountAmount = 0;
    if (discount?.percentage && subtotal > 0) {
      discountAmount = subtotal * discount.percentage;
    }
    const total = subtotal - discountAmount;

    return {
      subtotal,
      discountAmount,
      total,
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
    };
  }
);

// --- React Components ---

// Product Item Component (Memoized for performance)
const ProductItem = memo(({ course }) => {
  const dispatch = useDispatch();
  console.log(`Rendering ProductItem: ${course.title}`); // For optimization check

  const handleAddToCart = useCallback(() => {
    dispatch(addItem(course));
  }, [dispatch, course]);

  return (
    <div className="product-item">
      <div>
        <h3>{course.title}</h3>
        <p>{course.description}</p>
      </div>
      <div>
        <div className="product-price">${course.price.toFixed(2)}</div>
        <button onClick={handleAddToCart} className="btn btn-primary">
          Add to Cart
        </button>
      </div>
    </div>
  );
});

// Product List Component
const ProductList = ({ courses }) => {
  console.log('Rendering ProductList');
  return (
    <div className="product-list-container">
        <h2>Available Courses</h2>
        <div className="product-list">
            {courses.map((course) => (
                <ProductItem key={course.id} course={course} />
            ))}
        </div>
    </div>
  );
};

// Cart Item Component (Memoized for performance)
const CartItem = memo(({ item }) => {
  const dispatch = useDispatch();
  const { course, quantity } = item;
  console.log(`Rendering CartItem: ${course.title}`); // For optimization check

  const handleQuantityChange = useCallback((e) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (!isNaN(newQuantity)) {
      dispatch(updateQuantity({ courseId: course.id, quantity: newQuantity }));
    }
  }, [dispatch, course.id]);

  const handleIncrement = useCallback(() => {
      dispatch(updateQuantity({ courseId: course.id, quantity: quantity + 1 }));
  }, [dispatch, course.id, quantity]);

    const handleDecrement = useCallback(() => {
      dispatch(updateQuantity({ courseId: course.id, quantity: quantity - 1 }));
  }, [dispatch, course.id, quantity]);


  const handleRemove = useCallback(() => {
    dispatch(removeItem(course.id));
  }, [dispatch, course.id]);

  return (
    <div className="cart-item">
       {/* Placeholder for image maybe */}
      {/* <img src={course.imageUrl || 'placeholder.png'} alt={course.title} width="50" /> */}
      <div className="cart-item-info">
        <h4>{course.title}</h4>
        <span className="cart-item-price">${course.price.toFixed(2)}</span>
      </div>
      <div className="cart-item-quantity">
        <button onClick={handleDecrement} className="btn btn-secondary" disabled={quantity <= 1}>-</button>
        <input
          type="number"
          value={quantity}
          onChange={handleQuantityChange}
          min="0" // Allow 0 input to trigger removal in reducer
          aria-label={`Quantity for ${course.title}`}
        />
        <button onClick={handleIncrement} className="btn btn-secondary">+</button>
      </div>
       <div className="cart-item-remove">
        <button onClick={handleRemove} className="btn btn-danger btn-sm">
            Remove
        </button>
      </div>
    </div>
  );
});


// Discount Input Component
const DiscountInput = () => {
  const [discountCode, setDiscountCode] = useState('');
  const dispatch = useDispatch();
  const discountStatus = useSelector(selectDiscountStatus);
  const discountError = useSelector(selectDiscountError);
  const appliedDiscount = useSelector(selectDiscount);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(applyDiscountCode(discountCode));
  };

  return (
    <div className="discount-section">
      <h3>Apply Discount</h3>
      <form onSubmit={handleSubmit} className="discount-form">
        <input
          type="text"
          value={discountCode}
          onChange={(e) => setDiscountCode(e.target.value)}
          placeholder="Enter discount code"
          aria-label="Discount Code"
          disabled={discountStatus === 'loading'}
        />
        <button type="submit" className="btn btn-secondary" disabled={discountStatus === 'loading'}>
          {discountStatus === 'loading' ? 'Applying...' : 'Apply'}
        </button>
      </form>

      {/* Status/Error Message */}
      {discountStatus === 'loading' && <div className="discount-status loading">Checking code...</div>}
      {discountStatus === 'succeeded' && appliedDiscount && (
        <div className="discount-status success">
          Applied: {appliedDiscount.description} ({appliedDiscount.code})
        </div>
      )}
      {discountStatus === 'failed' && discountError && (
        <div className="discount-status error">{discountError}</div>
      )}
    </div>
  );
};


// Shopping Cart Component
const ShoppingCart = () => {
  // Use memoized selectors
  const items = useSelector(selectCartItemsArray);
  const { subtotal, discountAmount, total, itemCount } = useSelector(selectCartTotals);
  const appliedDiscount = useSelector(selectDiscount);
  const dispatch = useDispatch();
  console.log('Rendering ShoppingCart');

   const handleClearCart = useCallback(() => {
        if(window.confirm("Are you sure you want to clear the entire cart?")) {
            dispatch(clearCart());
        }
    }, [dispatch]);

  const handleCheckout = () => {
      alert(`Checkout initiated! Total: $${total.toFixed(2)} for ${itemCount} items. Thank you for your purchase!`);
      // Potentially clear cart after checkout simulation
      // dispatch(clearCart());
  };


  return (
    <div className="cart-container">
      <h2>Your Cart</h2>
      {items.length === 0 ? (
        <p className="cart-empty">Your cart is currently empty.</p>
      ) : (
        <>
          <div className="cart-items-list">
            {items.map((item) => (
              <CartItem key={item.course.id} item={item} />
            ))}
          </div>

          <DiscountInput />

          <div className="cart-totals">
            <div>
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {appliedDiscount && discountAmount > 0 && (
              <div>
                <span>Discount ({appliedDiscount.code}):</span>
                <span className="applied-discount">-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="total-price">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button onClick={handleClearCart} className="btn btn-danger" style={{marginRight: '10px', marginTop: '15px'}}>Clear Cart</button>
          <button onClick={handleCheckout} className="btn btn-primary checkout-button">
            Proceed to Checkout
          </button>
        </>
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  return (
    <>
      <h1>AI & Programming Course Store</h1>
      <div className="app-container">
        <ProductList courses={MOCK_COURSES} />
        <ShoppingCart />
      </div>
    </>
  );
};

// --- Render Application ---
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      {/* PersistGate delays rendering until persisted state is loaded */}
      <PersistGate loading={<div>Loading persisted state...</div>} persistor={persistor}>
        <App />
      </PersistGate>
    </Provider>
  </React.StrictMode>
);