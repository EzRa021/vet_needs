"use client";

import React, { createContext, useContext, useReducer } from 'react';
import { useToast } from '@/hooks/use-toast';
const CartContext = createContext();

const initialState = {
  items: [],
  total: 0,
  paymentMethod: null
};

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(item => item.id === action.payload.id);
      if (existingItemIndex !== -1) {
        const updatedItems = state.items.map((item, index) => 
          index === existingItemIndex 
            ? { ...item, quantity: item.quantity + action.payload.quantity }
            : item
        );
        return {
          ...state,
          items: updatedItems,
          total: calculateTotal(updatedItems)
        };
      } else {
        const updatedItems = [...state.items, action.payload];
        return {
          ...state,
          items: updatedItems,
          total: calculateTotal(updatedItems)
        };
      }
    }
    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.id !== action.payload);
      return {
        ...state,
        items: updatedItems,
        total: calculateTotal(updatedItems)
      };
    }
    case 'UPDATE_QUANTITY': {
      const updatedItems = state.items.map(item => 
        item.id === action.payload.id
          ? { ...item, quantity: Math.max(action.payload.quantity, -1) }
          : item
      );
      return {
        ...state,
        items: updatedItems,
        total: calculateTotal(updatedItems)
      };
    }
    case 'SET_PAYMENT_METHOD':
      return {
        ...state,
        paymentMethod: action.payload
      };
    case 'CLEAR_CART':
      return initialState;
    default:
      return state;
  }
}

function calculateTotal(items) {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = (item) => dispatch({ type: 'ADD_ITEM', payload: item });
  const removeItem = (itemId) => dispatch({ type: 'REMOVE_ITEM', payload: itemId });
  const updateQuantity = (itemId, quantity) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id: itemId, quantity } });
  const setPaymentMethod = (method) => dispatch({ type: 'SET_PAYMENT_METHOD', payload: method });
  const clearCart = () => dispatch({ type: 'CLEAR_CART' });
  const { toast } = useToast();
  const processTransaction = (branch, department) => {
    const transactionId = `TRX-${Date.now()}`;
    const transaction = {
      id: transactionId,
      branch,
      department,
      items: state.items,
      total: state.total,
      paymentMethod: state.paymentMethod,
      timestamp: new Date()
    };
    toast({
      title: "Success",
      description: 'Transaction processed successfully',
    });

    
    clearCart();
    return transaction;
  };

  return (
    <CartContext.Provider value={{
      state,
      addItem,
      removeItem,
      updateQuantity,
      setPaymentMethod,
      clearCart,
      processTransaction
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
