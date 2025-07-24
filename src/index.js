import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client'; // Updated import
import { observable, action, computed, makeObservable, reaction } from 'mobx';
import { observer } from 'mobx-react';
import './index.css';

class CartStore {
  @observable courses = [];
  @observable coursesLoading = false;
  @observable coursesError = null;
  @observable items = [];
  @observable promo = null;
  @observable discount = 0;
  @observable promoLoading = false;
  @observable promoError = null;

  constructor() {
    makeObservable(this);
    // Hydrate from localStorage
    const saved = localStorage.getItem('cart');
    if (saved) {
      const data = JSON.parse(saved);
      this.items = data.items || [];
      this.promo = data.promo || null;
      this.discount = data.discount || 0;
    }
    // Auto-save on changes
    reaction(
      () => JSON.stringify({ items: this.items, promo: this.promo, discount: this.discount }),
      (json) => localStorage.setItem('cart', json)
    );
  }

  @action async fetchCourses() {
    this.coursesLoading = true;
    this.coursesError = null;
    try {
      // Mock network request
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.courses = [
        { id: 1, title: 'AI Basics', price: 100, description: 'Fundamentals of Artificial Intelligence.' },
        { id: 2, title: 'Advanced AI', price: 200, description: 'Deep learning and neural networks.' },
        { id: 3, title: 'Programming 101', price: 50, description: 'Introduction to coding concepts.' },
        { id: 4, title: 'React Mastery', price: 150, description: 'Advanced React techniques for developers.' },
      ];
    } catch (e) {
      this.coursesError = 'Failed to load courses. Please try again.';
    } finally {
      this.coursesLoading = false;
    }
  }

  @action addItem(course) {
    const existing = this.items.find((i) => i.id === course.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.items.push({ ...course, qty: 1 });
    }
  }

  @action removeItem(id) {
    this.items = this.items.filter((i) => i.id !== id);
  }

  @action updateQty(id, qty) {
    const item = this.items.find((i) => i.id === id);
    if (item && qty >= 1) {
      item.qty = qty;
    }
  }

  @action async applyPromo(code) {
    this.promoLoading = true;
    this.promoError = null;
    try {
      // Mock network request for promo validation
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (code.toUpperCase() === 'DISCOUNT10') {
        this.discount = 10;
        this.promo = code;
      } else {
        throw new Error('Invalid promo code.');
      }
    } catch (e) {
      this.promoError = e.message;
    } finally {
      this.promoLoading = false;
    }
  }

  @computed get total() {
    const subtotal = this.items.reduce((sum, i) => sum + i.price * i.qty, 0);
    return subtotal * (1 - this.discount / 100);
  }
}

const store = new CartStore();

const CourseItem = observer(({ course, store }) => (
  <div className="course">
    <h3>{course.title}</h3>
    <p>{course.description}</p>
    <p>${course.price.toFixed(2)}</p>
    <button onClick={() => store.addItem(course)}>Add to Cart</button>
  </div>
));

const CartItem = observer(({ item, store }) => (
  <div className="cart-item">
    <h4>{item.title}</h4>
    <p>
      ${item.price.toFixed(2)} x{' '}
      <input
        type="number"
        value={item.qty}
        onChange={(e) => store.updateQty(item.id, parseInt(e.target.value, 10))}
        min="1"
      />
    </p>
    <button onClick={() => store.removeItem(item.id)}>Remove</button>
  </div>
));

const Cart = observer(({ store }) => {
  const [promoCode, setPromoCode] = useState('');
  return (
    <div className="cart">
      <h2>Shopping Cart</h2>
      {store.items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        store.items.map((item) => <CartItem key={item.id} item={item} store={store} />)
      )}
      <div className="promo-section">
        <input
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          placeholder="Enter promo code"
        />
        <button onClick={() => store.applyPromo(promoCode)} disabled={store.promoLoading}>
          Apply Promo
        </button>
        {store.promoLoading && <p className="loading">Applying...</p>}
        {store.promoError && <p className="error">{store.promoError}</p>}
        {store.promo && <p className="success">Applied: {store.promo} ({store.discount}% off)</p>}
      </div>
      <h3>Total: ${store.total.toFixed(2)}</h3>
    </div>
  );
});

const App = observer(({ store }) => {
  useEffect(() => {
    store.fetchCourses();
  }, [store]);

  return (
    <div className="app">
      <h1>AI & Programming Courses</h1>
      {store.coursesLoading && <p className="loading">Loading courses...</p>}
      {store.coursesError && <p className="error">{store.coursesError}</p>}
      <div className="course-list">
        {store.courses.map((course) => (
          <CourseItem key={course.id} course={course} store={store} />
        ))}
      </div>
      <Cart store={store} />
    </div>
  );
});

// Updated rendering method for React 19
const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode> {/* Optional: Enables additional checks in development */}
    <App store={store} />
  </React.StrictMode>
);