# Gift List Workflow Documentation

This document explains how to add new gift items to the gift list and register them in the backend canister.

## Overview

The gift list system consists of two parts:
1. **Frontend**: Gift items displayed in `content/gift-list.md` using custom `<gift-item>` HTML elements
2. **Backend**: Internet Computer canister that tracks reservation status for each gift

## Step 1: Scrape Product Information

Before adding a gift item, gather all necessary information from the product page, including the price.

### Price Scraping

**Always scrape the price** from the product page. Prices are displayed in the gift item description and help people make purchasing decisions.

#### How to Scrape Prices

1. **Visit the product URL** provided
2. **Locate the price** on the product page
3. **Extract the numeric value** (remove currency symbols, commas, etc.)
4. **Note any sale/discount prices** if applicable

#### Common Store Price Locations

- **Steam**: 
  - Look for `data-price-final="[cents]"` attribute in HTML (e.g., `data-price-final="2519"` = $25.19 → `25.19`)
  - Or check the displayed price in the purchase section
  - Steam stores prices in cents, so divide by 100
- **Amazon**: Price is typically shown near the "Add to Cart" button (e.g., "$35.00" → `35` or `35.00`)
- **Nintendo eShop**: Price shown in the purchase section
- **E-commerce sites (Shopify)**: Usually displayed prominently near product title or in cart section
- **Other stores**: Look for price near "Buy Now", "Add to Cart", or product title

#### Price Format

- Use numeric format: `"188"`, `"49.99"`, `"35.00"`
- No currency symbols or commas
- Include cents if shown (e.g., `"19.99"` not `"20"`)
- If price varies (sizes/options), use the base price or most common variant

#### Discount Pricing

If an item is on sale:
- **`price`**: Current discounted price
- **`originalPrice`**: Original price before discount
- The component will automatically display the original price with strikethrough and highlight the discounted price in red
- Example: `originalPrice="27.99" price="25.19"` will show ~~$27.99~~ **$25.19**

### Other Information to Gather

- **Product title**: Exact name from the page
- **Image URL**: Direct link to product image (right-click → Copy Image Address)
- **Store name**: The retailer/source name
- **Description**: Size, color, platform, or other relevant details

## Step 2: Add Gift Item to Markdown File

### File Location
- **File**: `content/gift-list.md`

### Structure

Gift items are organized into sections (Clothing, Stuff, Games) using `<h2>` headings and `<section class="gift-section">` containers.

### Gift Item Format

Each gift item uses a custom `<gift-item>` HTML element with the following attributes:

```html
<gift-item
    link="[product URL]"
    linkText="[store/source name]"
    image="[image URL]"
    id="[unique-kebab-case-id]"
    title="[Product Title]"
    description="[optional description]"
    price="[current/scraped price]"
    originalPrice="[original price if on discount]"
    alt="[image alt text]"
></gift-item>
```

### Required Attributes

- **`link`**: Full URL to the product page
- **`linkText`**: Display name of the store/source (e.g., "Steam", "Amazon", "Nintendo")
- **`image`**: Full URL to the product image
- **`id`**: Unique identifier in kebab-case (e.g., `unbeatable`, `curator-pants`, `split-fiction`)
  - This ID must match the one used when registering in the canister
- **`title`**: Product name/title
- **`alt`**: Descriptive alt text for the image
- **`price`**: **Current/scraped price** as a number (will be formatted as currency automatically)

### Optional Attributes

- **`description`**: Additional details (size, color, platform, etc.)
- **`originalPrice`**: Original price before discount (for items on sale). When provided, the original price will be displayed with strikethrough and the current price will be highlighted in red.

### Example (Regular Price)

```html
<gift-item
    link="https://store.steampowered.com/app/2240620/UNBEATABLE/"
    linkText="Steam"
    image="https://kagi.com/proxy/250px-Unbeatable_cover.jpg?c=..."
    id="unbeatable"
    title="UNBEATABLE"
    description="Steam PC game"
    price="25.19"
    alt="UNBEATABLE game cover art"
></gift-item>
```

### Example (Discount Price)

```html
<gift-item
    link="https://store.steampowered.com/app/2240620/UNBEATABLE/"
    linkText="Steam"
    image="https://kagi.com/proxy/250px-Unbeatable_cover.jpg?c=..."
    id="unbeatable"
    title="UNBEATABLE"
    description="Steam PC game"
    originalPrice="27.99"
    price="25.19"
    alt="UNBEATABLE game cover art"
></gift-item>
```

**Note**: 
- The current price (`25.19`) was scraped from the Steam store page (`data-price-final="2519"` = 2519 cents = $25.19)
- The original price (`27.99`) was found in the discount information (10% off from $27.99)
- When `originalPrice` is provided and greater than `price`, the component displays the original price with strikethrough and highlights the discounted price

### Adding to the Correct Section

1. Find the appropriate section (`<h2>Clothing</h2>`, `<h2>Stuff</h2>`, or `<h2>Games</h2>`)
2. Add the `<gift-item>` element inside the corresponding `<section class="gift-section">` block
3. Place it after existing items but before the closing `</section>` tag

## Step 3: Register Gift in Canister

After adding the gift item to the markdown file, register it in the backend canister so it can track reservation status.

### Canister Information

- **Canister ID**: `eoexx-syaaa-aaaab-qahzq-cai`
- **Network**: Internet Computer (IC) mainnet

### Registration Command

```bash
dfx canister --network ic call eoexx-syaaa-aaaab-qahzq-cai registerGift '("[gift-id]")'
```

Replace `[gift-id]` with the same `id` attribute value used in the `<gift-item>` element.

### Example

For the "unbeatable" gift:

```bash
dfx canister --network ic call eoexx-syaaa-aaaab-qahzq-cai registerGift '("unbeatable")'
```

### Expected Output

Success returns `()`, indicating the gift was registered successfully.

### Important Notes

- The `id` in the markdown file **must match** the ID used in the `registerGift` command
- The canister uses this ID to track reservation status via the API endpoint: `https://eoexx-syaaa-aaaab-qahzq-cai.icp0.io/gifts/{id}`
- If registration fails, check that:
  - You're connected to the IC network (`--network ic`)
  - The canister ID is correct
  - The ID format matches exactly (case-sensitive)

## Complete Workflow Example

### Adding "UNBEATABLE" Game

1. **Scrape information** from the Steam store page:
   - Visit: `https://store.steampowered.com/app/2240620/UNBEATABLE/`
   - Extract current price: Look for `data-price-final="2519"` → Convert from cents: `2519` cents = `$25.19` → `25.19`
   - Check for discount: Look for `data-discount` attribute or discount information
   - If discounted, extract original price: Look for `discount_original_price` or similar → `$27.99` → `27.99`
   - Get image URL and product title

2. **Add to markdown** (`content/gift-list.md`):
   ```html
   <gift-item
       link="https://store.steampowered.com/app/2240620/UNBEATABLE/"
       linkText="Steam"
       image="https://kagi.com/proxy/250px-Unbeatable_cover.jpg?c=..."
       id="unbeatable"
       title="UNBEATABLE"
       description="Steam PC game"
       originalPrice="27.99"
       price="25.19"
       alt="UNBEATABLE game cover art"
   ></gift-item>
   ```

3. **Register in canister**:
   ```bash
   dfx canister --network ic call eoexx-syaaa-aaaab-qahzq-cai registerGift '("unbeatable")'
   ```

## Cursor Command Template

For future Cursor commands, use this template:

```
Add [product name] to my gift items. 
- Link: [product URL]
- Image: [image URL]
- Section: [Clothing/Stuff/Games]
- Title: [Product Title]
- Description: [optional description]
- ID: [kebab-case-id]
```

**Important**: When adding a gift item, always:
1. **Scrape the price** from the product page
2. Include the `price` attribute in the `<gift-item>` element
3. Use numeric format (e.g., `"19.99"`, `"188"`, `"35.00"`)
4. **If the item is on sale/discount**, also scrape and include the `originalPrice` attribute
5. The component will automatically display discount pricing with strikethrough when `originalPrice` is provided

Then follow up with:
```
dfx registerGift for [kebab-case-id]
```

### Automated Price Scraping

When processing gift item requests, always:
- Visit the product URL
- Locate and extract the current price
- Include it in the `price` attribute
- Format as a number without currency symbols
- **Check for discounts**: If the item is on sale, also extract the original price and include it in the `originalPrice` attribute
- The component will automatically display the discount with strikethrough pricing

## Technical Details

### Backend API

The canister exposes HTTP endpoints:
- `GET /gifts/{id}` - Get gift status (reserved/available)
- `POST /gifts/{id}/toggle` - Toggle reservation status

### Frontend Component

The `<gift-item>` custom element is defined in `static/GiftItem.js` and:
- Displays product information
- Shows reservation checkbox
- Polls canister for status updates
- Allows toggling reservation via POST request

### ID Naming Convention

Use kebab-case for IDs:
- ✅ `unbeatable`
- ✅ `curator-pants`
- ✅ `split-fiction`
- ❌ `Unbeatable` (wrong case)
- ❌ `unbeatable_game` (use hyphens, not underscores)
