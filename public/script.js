let currentSort = 'default';

document.getElementById('sortButton').addEventListener('click', () => {
  // Update the current sort type based on the selected option
  currentSort = document.getElementById('sortDropdown').value;
  updateProducts();
});


async function updateProducts() {
  try {
    const name = document.getElementById('searchInput').value;
const minPrice = document.getElementById('minPrice').value;
const maxPrice = document.getElementById('maxPrice').value;


   const response = await fetch('/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name, sortType: currentSort, minPrice: parseFloat(minPrice), maxPrice: parseFloat(maxPrice) }),
});

    if (response.ok) {
      const products = await response.json();
      updateProductList(products);
    } else {
      console.error('Response not ok with status:', response.status);
    }
  } catch (error) {
    console.error('Fetch error:', error.message);
  }
}

function updateProductList(products) {
  const container = document.getElementById('productsList');
  container.innerHTML = ''; // Clear previous products

  if (products.length === 0) {
    container.innerHTML = '<p>No products found.</p>';
    return;
  }

  products.forEach(product => {
    const productElement = document.createElement('div');
    productElement.classList.add('col-md-4', 'mb-4', 'product-square', 'text-center', 'custom-product-tile');
    
    if (product.stock === 0) {
      // Product is sold out
      productElement.innerHTML = `
        <img src="https://solutions.lykdat.com/blog/content/images/2022/04/sold-out-price-tag-sign_123447-162-1.webp" class="product-image" alt="${product.name}">
        <h5>SOLD OUT: ${product.name} </h5>
        <p class="product-description">${product.description}</p>
        <p><strong>Price:</strong> $${product.price} ——— <strong>Stock:</strong> SOLD OUT</p>
        <p>This product is currently sold out.</p>
      `;
    } else {
      // Product is not sold out
   productElement.innerHTML = `
    <img src="${product.imageLink}" class="product-image" alt="${product.name}">
    <h5>${product.name}</h5>
    <p class="product-description">${product.description}</p>
    <p><strong>Price:</strong> $${product.price} ——— <strong>Stock:</strong> ${product.stock} available</p>
    <form class="mt-3" action="/addToCart" method="POST">
      <div class="row align-items-center">
        <div class="col-md-5">
          <label for="quantity-${product.name}" class="mr-2">Quantity:</label>
          <input type="number" id="quantity-${product.name}" name="quantity" value="1" class="form-control" min="0" max="${product.stock}">
          <input type="hidden" name="productId" value="${product._id}">
        </div>
        <div class="col-md-5">
          <button type="submit" class="btn btn-primary btn-block narrower-button">🛒 Add to Cart</button>
        </div>
      </div>
    </form>
  `;
}

    container.appendChild(productElement);
  });
}

// Initial update of products
updateProducts();

//// Event listeners
//document.getElementById('sortButton').addEventListener('click', () => {
//  const sortType = document.getElementById('sortDropdown').value;
//  sortProducts(sortType);
//});

document.getElementById('sortButton').addEventListener('click', () => {
  // Update the current sort type based on the selected option
  currentSort = document.getElementById('sortDropdown').value;
  updateProducts();
});

document.getElementById('filterButton').addEventListener('click', () => {
  // Update the current sort type based on the selected option
  currentSort = document.getElementById('sortDropdown').value;
  updateProducts();
});

document.getElementById('searchInput').addEventListener('input', updateProducts);

// Function to add product to cart (you can replace or enhance this function based on your cart logic)
function addToCart(productName) {
  alert(`Added ${productName} to cart!`);
}

// Function to view product details (you can replace or enhance this function based on your product details logic)
function viewProduct(productId) {
  // Redirect to the product details page using the productId
  window.location.href = `/product-details/${productId}`;
}

