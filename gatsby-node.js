const fetch = require("node-fetch");
const { createRemoteFileNode } = require(`gatsby-source-filesystem`);

const SELLABLE_NODE_TYPE = `SpreadshirtSellable`;
const PRODUCTTYPE_NODE_TYPE = `SpreadshirtProductType`;
const CURRENCY_NODE_TYPE = `SpreadshirtCurrency`;

fetchApi = async (apiKey, resource) => {
  const requestOptions = {
    method: "GET",
    headers: {
      "User-Agent":
        "Gatsby-source-spreadshirt/0.1 (Devine.be; simon.vanherweghe@howest.be)",
      Authorization: `SprdAuth apiKey="${apiKey}"`,
    },
    redirect: "follow",
  };
  const response = await fetch(
    `https://api.spreadshirt.net/api/v1/${resource}`,
    requestOptions
  );
  return await response.json();
};

getAllSellables = async (apiKey, shopId) =>
  await fetchApi(apiKey, `shops/${shopId}/sellables?page=0&mediaType=json`);

getProductType = async (apiKey, shopId, id) =>
  await fetchApi(
    apiKey,
    `shops/${shopId}/productTypes/${id}?page=0&mediaType=json`
  );

getCurrency = async (apiKey, id) =>
  await fetchApi(apiKey, `currencies/${id}?mediaType=json`);

exports.onPreInit = () => console.log("Loaded gatsby-source-spreadshirt");

exports.createSchemaCustomization = ({ actions }) => {
  const { createTypes } = actions;
  createTypes(`
    type Price implements Node {
      amount: Float!
      currency: ${CURRENCY_NODE_TYPE} @link(from: "price.currencyId" by: "currencyId" )
    }
    type ${SELLABLE_NODE_TYPE} implements Node {
      id: ID!
      productType: ${PRODUCTTYPE_NODE_TYPE} @link(from: "productTypeId" by: "productTypeId" )
      price: Price!
    }
    type ${PRODUCTTYPE_NODE_TYPE} implements Node {
      id: ID!
      name: String!
    }
    type ${CURRENCY_NODE_TYPE} implements Node {
      id: ID!
    }`);
};

exports.sourceNodes = async (
  { actions, createContentDigest, createNodeId, getNodesByType },
  pluginOptions
) => {
  const { createNode } = actions;
  const { shopId, apiKey } = pluginOptions;

  const productTypeIds = new Set();
  const currencyIds = new Set();

  const sellables = await getAllSellables(apiKey, shopId);

  sellables.sellables.forEach((sellable) => {
    productTypeIds.add(sellable.productTypeId);
    currencyIds.add(sellable.price.currencyId);
    createNode({
      ...sellable,
      id: createNodeId(`${SELLABLE_NODE_TYPE}-${sellable.sellableId}`),
      parent: null,
      children: [],
      internal: {
        type: SELLABLE_NODE_TYPE,
        content: JSON.stringify(sellable),
        contentDigest: createContentDigest(sellable),
      },
    });
  });

  const productTypes = await Promise.all(
    Array.from(productTypeIds).map(async (productTypeId) => {
      console.log("productType", productTypeId);
      return await getProductType(apiKey, shopId, productTypeId);
    })
  );

  productTypes.forEach((productType) => {
    createNode({
      ...productType,
      id: createNodeId(`${PRODUCTTYPE_NODE_TYPE}-${productType.id}`),
      productTypeId: productType.id,
      parent: null,
      children: [],
      internal: {
        type: PRODUCTTYPE_NODE_TYPE,
        content: JSON.stringify(productType),
        contentDigest: createContentDigest(productType),
      },
    });
  });

  const currencies = await Promise.all(
    Array.from(currencyIds).map(async (currencyId) => {
      console.log("currency", currencyId);
      return await getCurrency(apiKey, currencyId);
    })
  );

  currencies.forEach((currency) => {
    createNode({
      ...currency,
      id: createNodeId(`${CURRENCY_NODE_TYPE}-${currency.id}`),
      currencyId: currency.id,
      parent: null,
      children: [],
      internal: {
        type: CURRENCY_NODE_TYPE,
        content: JSON.stringify(currency),
        contentDigest: createContentDigest(currency),
      },
    });
  });

  return;
};

exports.onCreateNode = async ({
  node, // the node that was just created
  actions: { createNode },
  createNodeId,
  getCache,
}) => {
  if (node.internal.type === SELLABLE_NODE_TYPE) {
    const fileNode = await createRemoteFileNode({
      // the url of the remote image to generate a node for
      url: node.previewImage.url,
      parentNodeId: node.id,
      createNode,
      createNodeId,
      getCache,
    });
    console.log("Image created", node.previewImage.url);
    if (fileNode) {
      node.remoteImage___NODE = fileNode.id;
    }
  }
};
