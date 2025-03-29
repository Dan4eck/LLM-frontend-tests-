// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider, useSelector, useDispatch } from "react-redux";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import "./index.css";

const savedState = JSON.parse(localStorage.getItem("cartState")) || {
  cart: [],
  discount: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState: savedState,
  reducers: {
    addItem: (state, action) => {
      const existing = state.cart.find(item => item.id === action.payload.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.cart.push({ ...action.payload, quantity: 1 });
      }
    },
    removeItem: (state, action) => {
      state.cart = state.cart.filter(item => item.id !== action.payload);
    },
    updateQuantity: (state, action) => {
      const item = state.cart.find(i => i.id === action.payload.id);
      if (item) {
        item.quantity = action.payload.quantity;
      }
    },
    applyDiscount: (state, action) => {
      state.discount = action.payload;
    },
    clearCart: (state) => {
      state.cart = [];
      state.discount = null;
    }
  }
});

const store = configureStore({
  reducer: cartSlice.reducer,
});

store.subscribe(() => {
  localStorage.setItem("cartState", JSON.stringify(store.getState()));
});

function CourseList() {
  const dispatch = useDispatch();
  const courses = [
    { id: 1, name: "Intro to AI", price: 99 },
    { id: 2, name: "Mastering React", price: 120 },
    { id: 3, name: "Data Structures in JS", price: 89 },
  ];

  return (
    <div className="course-list">
      <h2>Available Courses</h2>
      {courses.map(course => (
        <div className="course" key={course.id}>
          <span>{course.name}</span>
          <span>${course.price}</span>
          <button onClick={() => dispatch(cartSlice.actions.addItem(course))}>
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
}

function Cart() {
  const cart = useSelector(state => state.cart);
  const discount = useSelector(state => state.discount);
  const dispatch = useDispatch();

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountedTotal = discount ? total * (1 - discount.amount) : total;

  const handlePromo = async () => {
    try {
      const res = await fetch("/api/promo");
      if (!res.ok) throw new Error("Invalid promo");
      const promo = await res.json();
      dispatch(cartSlice.actions.applyDiscount(promo));
    } catch (e) {
      alert("Failed to apply promo code: " + e.message);
    }
  };

  return (
    <div className="cart">
      <h2>Your Cart</h2>
      {cart.map(item => (
        <div className="cart-item" key={item.id}>
          <span>{item.name}</span>
          <input
            type="number"
            value={item.quantity}
            min="1"
            onChange={(e) => dispatch(cartSlice.actions.updateQuantity({ id: item.id, quantity: parseInt(e.target.value) }))}
          />
          <span>${item.price * item.quantity}</span>
          <button onClick={() => dispatch(cartSlice.actions.removeItem(item.id))}>
            Remove
          </button>
        </div>
      ))}
      <div className="total">
        <button onClick={handlePromo}>Apply Promo</button>
        <p>Total: ${discountedTotal.toFixed(2)}</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="app">
      <h1>🧠 AI & Programming Courses</h1>
      <div className="main">
        <CourseList />
        <Cart />
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <App />
  </Provider>
);