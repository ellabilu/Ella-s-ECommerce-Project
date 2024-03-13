import Customer from '../models/Customer.js';
import Product from '../models/Product.js';

export const home = async (req, res) => {
  let customer = await Customer.findById(req.user._id);
  if (!customer.cart) {
    customer.cart = { items: [], totalQuantity: 0, totalPrice: 0 };
  }
  if (!customer.purchases) {
    customer.purchases = { items: [], totalQuantity: 0, totalPrice: 0 };
  } 
  customer.save();
  
  const products = await Product.find();
  res.render('index', { products });
};

export const getProducts = async (req, res) => {
  const { name, sortType, minPrice, maxPrice } = req.body;
  let query = {};

  if (name) {
    query.name = { $regex: name, $options: 'i' }; // Case-insensitive search
  }

  let priceRangeQuery = {};

  if (minPrice !== undefined && maxPrice !== undefined) {
  priceRangeQuery.price = { $gte: parseFloat(minPrice), $lte: parseFloat(maxPrice) };
} else if (minPrice !== undefined) {
  priceRangeQuery.price = { $gte: parseFloat(minPrice) };
} else if (maxPrice !== undefined) {
  priceRangeQuery.price = { $lte: parseFloat(maxPrice) };
}
  let sortCriteria = {};

  switch (sortType) {
    case 'priceAsc':
      sortCriteria = { price: 1 };
      break;
    case 'priceDesc':
      sortCriteria = { price: -1 };
      break;
    case 'stockAsc':
      sortCriteria = { stock: 1 };
      break;
    case 'stockDesc':
      sortCriteria = { stock: -1 };
      break;
    case 'nameAsc':
      sortCriteria = { name: 1 };
      break;
    case 'nameDesc':
      sortCriteria = { name: -1 };
      break;
    default:
      // Handle default sorting or no sorting
      break;
  }

  try {
    const products = await Product.find({ ...query, ...priceRangeQuery }).sort(sortCriteria);
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send(error);
  }
};



export const addToCart = async (req, res) => {
  try {
    let { productId, quantity } = req.body;
    quantity = parseInt(quantity);

    const product = await Product.findById(productId);

    if (!product) {
      req.flash('error', 'Product not found.');
      return res.redirect('/'); // Redirect to the home page or handle as needed
    }

    const price = product.price;

    // Check if the product is SOLD OUT
    if (product.stock === 0) {
      req.flash('error', 'This product is SOLD OUT.');
      return res.redirect('/'); // Redirect to the home page or handle as needed
    }

    // If the quantity is greater than the available stock, set it to the available stock
    quantity = Math.min(quantity, product.stock);

    // Subtract quantity from product stock
    product.stock -= quantity;
    await product.save();

    const userId = req.user._id;
    let customer = await Customer.findOne({ _id: userId });

    const itemIndex = customer.cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex > -1) {
      customer.cart.items[itemIndex].quantity += quantity;
      customer.cart.items[itemIndex].price = price;
    } else {
      customer.cart.items.push({ productId, quantity, price });
    }
    customer.cart.totalQuantity += quantity;
    customer.cart.totalPrice += price * quantity;

    // Flash message for the promo code
    req.flash('success', 'Item Successfully Added to Cart🎉🎉');

    await customer.save();

    const populatedCustomer = await Customer.findOne({ _id: userId }).populate('cart.items.productId');
    res.redirect('/showCart');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
};




export const showCart = async (req, res) => {
  try {
    const populatedCustomer = await Customer.findOne({ _id: req.user }).populate('cart.items.productId');
    res.render('cart', {user: populatedCustomer});
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
    console.log('Flash Messages in showCart:', res.locals.flashMessages);
}


export const clearCart = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.user }).populate('cart.items.productId');

    // Add the quantity back to product stock
    customer.cart.items.forEach(async (cartItem) => {
      const { productId, quantity } = cartItem;
      const product = await Product.findById(productId);

      if (product) {
        product.stock += quantity;
        await product.save();
      }
    });

    // Clear the customer's cart
    customer.cart = { items: [], totalQuantity: 0, totalPrice: 0 };
    await customer.save();

    // Flash message for clearing the cart
    req.flash('success', 'Your cart has been cleared successfully.');

    res.redirect('/showCart');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
};

export const removeCartItem = async (req, res) => {
  try {
    const productIdToRemove = req.body.productId;
    const customer = await Customer.findOne({ _id: req.user }).populate('cart.items.productId');

    // Find the index of the item in the cart
    const itemIndex = customer.cart.items.findIndex(item => item.productId._id.toString() === productIdToRemove);

    if (itemIndex > -1) {
      const removedItem = customer.cart.items.splice(itemIndex, 1)[0];
      customer.cart.totalQuantity -= removedItem.quantity;
      customer.cart.totalPrice -= removedItem.price * removedItem.quantity;

      // Add the quantity back to product stock
      const product = await Product.findById(productIdToRemove);
      if (product) {
        product.stock += removedItem.quantity;
        await product.save();
      }

      await customer.save();

      req.flash('success', 'Item removed from the cart.');
    } else {
      req.flash('error', 'Item not found in the cart.');
    }

    res.redirect('/showCart');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
};

export const purchase = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.user }).populate('cart.items.productId');

    const cartItems = customer.cart.items;

    cartItems.forEach(async (cartItem) => {
      const { productId, quantity, price } = cartItem; 
      
      const itemIndex = customer.purchases.items.findIndex(purchaseItem => purchaseItem.productId.toString() === productId.toString());

      if (itemIndex > -1) {
        customer.purchases.items[itemIndex].quantity += quantity;
        customer.purchases.items[itemIndex].price = price;
      } else {
        customer.purchases.items.push({ productId: productId, quantity: quantity, price: price });
      }
      
      customer.purchases.totalQuantity += quantity;
      customer.purchases.totalPrice += price * quantity;
    });

    // Clear the customer's cart after a successful purchase
    customer.cart = { items: [], totalQuantity: 0, totalPrice: 0 };
    await customer.save();

    res.redirect('/customer');  // Redirect to the desired page after a successful purchase
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
};




export const customer = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.user }).populate('purchases.items.productId');
      //console.log(customer.purchases.items);
    res.render('customer', {user: customer}); 
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred');
  }
}

