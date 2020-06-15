const fetch = require("node-fetch");
const { createRemoteFileNode } = require(`gatsby-source-filesystem`);

const SELLABLE_NODE_TYPE = `SpreadshirtSellable`;
const PRODUCTTYPE_NODE_TYPE = `SpreadshirtProductType`;
const CURRENCY_NODE_TYPE = `SpreadshirtCurrency`;

fetchApi = async (apiKey, resource) => {
  try {
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
    if (!response.ok) {
      // NOT res.status >= 200 && res.status < 300
      console.log(response.statusText);
      throw new Error({
        statusCode: response.status,
        body: response.statusText,
      });
    }
    return await response.json();
  } catch (error) {
    console.log(error);
    return error;
  }
};

getAllSellables = async (apiKey, shopId, locale) =>
  await fetchApi(
    apiKey,
    `shops/${shopId}/sellables?page=0&mediaType=json&locale=${locale}`
  );

getProductType = async (apiKey, shopId, locale, id) =>
  await fetchApi(
    apiKey,
    `shops/${shopId}/productTypes/${id}?page=0&mediaType=json&locale=${locale}`
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
    type Appearance {
      id: String!
      name: String!
      colors: [Color]
      printTypes: [PrintType]
      resources: [Resource]
    }
    type Color {
      index: Int!
      value: String!
    }
    type PrintType {
      href: String!
      id: String!
    }
    type Resource {
      mediaType: String!
      href: String!
      type: String
    }
    type Size {
      id: String!
      name: String!
      group: String!
      weight: Float! 
      measures: [Measure]
    }
    type Measure {
      name: String!
      value: MeasureValue!
    }
    type MeasureValue {
      value: Int!
      unit: String!
    }
    type PreviewImage {
      url: String!
      type: String!
    }
    type ${SELLABLE_NODE_TYPE} implements Node {
      id: ID!
      sellableId: String!
      name: String!
      slug: String!
      productType: ${PRODUCTTYPE_NODE_TYPE} @link(from: "productTypeId" by: "productTypeId" )
      price: Price!
      remoteImage: File @link
      appearanceIds: [String!]
      defaultAppearanceId: String!
    }
    type ${PRODUCTTYPE_NODE_TYPE} implements Node {
      id: ID!
      name: String!
      shortDescription: String!
      description: String!
      sizeFitHint: String!
      appearances: [Appearance!]
      sizes: [Size!]
      remoteImage: File @link
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
  const { shopId, apiKey, locale } = pluginOptions;

  const productTypeIds = new Set();
  const currencyIds = new Set();

  const sellables = await getAllSellables(apiKey, shopId, locale);

  if (sellables.sellables) {
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
    console.info(`Sellables created: ${sellables.sellables.length}`);
  }

  const productTypes = await Promise.all(
    Array.from(productTypeIds).map(async (productTypeId) => {
      return await getProductType(apiKey, shopId, locale, productTypeId);
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
  console.info(`ProductTypes created: ${productTypes.length}`);

  const currencies = await Promise.all(
    Array.from(currencyIds).map(async (currencyId) => {
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
  console.info(`Currencies created: ${currencies.length}`);

  return;
};

exports.onCreateNode = async ({
  node,
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

    if (fileNode) {
      node.remoteImage = fileNode.id;
    }
  }
  if (node.internal.type === PRODUCTTYPE_NODE_TYPE) {
    const sizes = node.resources.filter((res) => res.type === "size");
    if (sizes.length === 1) {
      const url = sizes[0].href;
      const fileNode = await createRemoteFileNode({
        // the url of the remote image to generate a node for
        url,
        parentNodeId: node.id,
        createNode,
        createNodeId,
        getCache,
      });
      if (fileNode) {
        node.remoteImage = fileNode.id;
      }
    }
  }
};
