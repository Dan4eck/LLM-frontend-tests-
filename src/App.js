import React from 'react';
import { useSelector, useDispatch, Provider } from 'react-redux';
import './App.css';
import store, { cartSlice, coursesSlice } from './store'; // We'll move store and slices to a new file for clarity

// Course List Component
function CourseList() {
  const dispatch = useDispatch();
  const { list: availableCourses, loading, error } = useSelector(state => state.courses);

  const handleAddToCart = (course) => {
    dispatch(cartSlice.actions.addItem(course));
  };

  if (loading) return <p className="loading-message">Loading courses...</p>;
  if (error) return <p className="error-message">Error loading courses: {error}</p>;

  return (
    <div className="course-list">
      <h2>Available Courses</h2>
      <ul>
        {availableCourses.map(course => (
          <li key={course.id} className="course-item">
            <span>{course.name} - ${course.price.toFixed(2)}</span>
            <button onClick={() => handleAddToCart(course)} className="add-to-cart-btn">
              Add to Cart
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Cart Item Component
function CartItem({ item }) {
  const dispatch = useDispatch();

  const handleQuantityChange = (e) => {
    const newQuantity = parseInt(e.target.value, 10);
    if (!isNaN(newQuantity)) {
      dispatch(cartSlice.actions.updateQuantity({ id: item.id, quantity: newQuantity }));
    }
  };

  const handleRemove = () => {
    dispatch(cartSlice.actions.removeItem({ id: item.id }));
  };

  return (
    <li className="cart-item">
      <span className="item-name">{item.name}</span>
      <span className="item-price">${item.price.toFixed(2)}</span>
      <input
        type="number"
        value={item.quantity}
        onChange={handleQuantityChange}
        min="1"
        className="item-quantity"
        aria-label={`Quantity for ${item.name}`}
      />
      <span className="item-total">${(item.price * item.quantity).toFixed(2)}</span>
      <button onClick={handleRemove} className="remove-item-btn" aria-label={`Remove ${item.name}`}>×</button>
    </li>
  );
}

// Shopping Cart Component
function ShoppingCart() {
  const cartState = useSelector(state => state.cart);
  const dispatch = useDispatch();
  const [discountInput, setDiscountInput] = React.useState('');

  const cartItems = cartState?.items || [];
  const discountCode = cartState?.discountCode;
  const discountAmount = cartState?.discountAmount || 0;

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountValue = subtotal * discountAmount;
  const total = subtotal - discountValue;

  const handleApplyDiscount = (e) => {
    e.preventDefault();
    if (discountInput.trim()) {
      dispatch(cartSlice.actions.applyDiscount(discountInput.trim()));
    }
  };

  const handleRemoveDiscount = () => {
    dispatch(cartSlice.actions.removeDiscount());
    setDiscountInput('');
  };

  return (
    <div className="shopping-cart">
      <h2>Your Cart</h2>
      {cartItems.length === 0 ? (
        <p className="empty-cart-message">Your cart is empty.</p>
      ) : (
        <>
          <ul>
            {cartItems.map(item => (
              <CartItem key={item.id} item={item} />
            ))}
          </ul>
          <div className="cart-summary">
            <form onSubmit={handleApplyDiscount} className="discount-form">
              <input
                type="text"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="Enter discount code"
                className="discount-input"
                aria-label="Discount Code"
              />
              <button type="submit" className="apply-discount-btn">Apply</button>
              {discountCode && (
                <button type="button" onClick={handleRemoveDiscount} className="remove-discount-btn">
                  Remove '{discountCode}' (-{(discountAmount * 100).toFixed(0)}%)
                </button>
              )}
            </form>
            <p>Subtotal: <span className="price">${subtotal.toFixed(2)}</span></p>
            {discountCode && (
              <p className="discount-applied">
                Discount ({discountCode} - {(discountAmount * 100).toFixed(0)}%):
                <span className="price negative">-${discountValue.toFixed(2)}</span>
              </p>
            )}
            <p className="total-price">Total: <span className="price">${total.toFixed(2)}</span></p>
            <button className="checkout-btn">Proceed to Checkout</button>
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1>AI & Programming Courses</h1>
      </header>
      <main className="app-main">
        <CourseList />
        <ShoppingCart />
      </main>
      <footer className="app-footer">
        <p>&copy; {new Date().getFullYear()} Awesome Course Site</p>
      </footer>
    </div>
  );
}

export default App;
