import { configureStore, createSlice } from '@reduxjs/toolkit';

// --- Mock Data ---
const courses = [
  { id: 'ai101', name: 'Intro to AI', price: 99.99 },
  { id: 'prog202', name: 'Advanced JavaScript', price: 129.99 },
  { id: 'data300', name: 'Data Science Fundamentals', price: 149.99 },
  { id: 'webdev404', name: 'Full-Stack React', price: 199.99 },
];

const validDiscounts = {
  SAVE10: 0.1, // 10% off
  CODEIUM20: 0.2, // 20% off
};

// --- Persistence Helpers ---
const loadState = () => {
  try {
    const serializedState = localStorage.getItem('cartState');
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error('Could not load state', err);
    return undefined;
  }
};

const saveState = (state) => {
  try {
    const stateToSave = {
      cart: state.cart,
    };
    const serializedState = JSON.stringify(stateToSave);
    localStorage.setItem('cartState', serializedState);
  } catch (err) {
    console.error('Could not save state', err);
  }
};

const initialCartState = {
  items: [],
  discountCode: null,
  discountAmount: 0,
};

const initialCoursesState = {
  list: courses,
  loading: false,
  error: null,
};

const preloadedState = loadState();

export const cartSlice = createSlice({
  name: 'cart',
  initialState: preloadedState?.cart || initialCartState,
  reducers: {
    addItem: (state, action) => {
      const itemToAdd = action.payload;
      const existingItem = state.items.find(item => item.id === itemToAdd.id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...itemToAdd, quantity: 1 });
      }
    },
    removeItem: (state, action) => {
      state.items = state.items.filter(item => item.id !== action.payload.id);
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const itemToUpdate = state.items.find(item => item.id === id);
      if (itemToUpdate) {
        const newQuantity = Math.max(1, parseInt(quantity, 10) || 1);
        itemToUpdate.quantity = newQuantity;
      }
    },
    applyDiscount: (state, action) => {
      const code = action.payload.toUpperCase();
      if (validDiscounts[code]) {
        state.discountCode = code;
        state.discountAmount = validDiscounts[code];
      } else {
        state.discountCode = null;
        state.discountAmount = 0;
        console.warn(`Invalid discount code applied: ${action.payload}`);
      }
    },
    removeDiscount: (state) => {
      state.discountCode = null;
      state.discountAmount = 0;
    },
  },
});

export const coursesSlice = createSlice({
  name: 'courses',
  initialState: initialCoursesState,
  reducers: {
    fetchCoursesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchCoursesSuccess: (state, action) => {
      state.list = action.payload;
      state.loading = false;
    },
    fetchCoursesFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

const store = configureStore({
  reducer: {
    cart: cartSlice.reducer,
    courses: coursesSlice.reducer,
  },
});

store.subscribe(() => {
  const currentState = store.getState();
  saveState({ cart: currentState.cart });
});

export default store;
