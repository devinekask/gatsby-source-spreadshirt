# Gatsby-Source-Spreadshirt plugin

## Description

Display the contents form a Spreadshirt shop on your Gatsby site.

Basic implementation, let's see how it will go.

### Currently implemented

- Sellable
- ProductType
- Currency

### Learning Resources

Follow guidelines on https://developer.spreadshirt.net/

## How to install

Install the plugin as usual

## When do I use this plugin?

When you want to have a static version of your Spreadshirt product pages

## Examples of usage

```
options: {
  shopId: SPREADSHIRT_SHOP_ID,
  apiKey: SPREADSHIRT_API_KEY,
}
```

## How to query for data (source plugins only)

```graphql
query MyQuery {
  allSpreadshirtSellable {
    edges {
      node {
        name
        productType {
          name
          shortDescription
        }
        price {
          amount
          currency {
            symbol
          }
        }
      }
    }
  }
}
```

## How to run tests

Euh... 😳

## How to develop locally

Create a clone and go for it!

## How to contribute

Just create an issue or a pull request.
