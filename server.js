const express = require('express')
const app = express();

const {createClient} = require('redis');
const client = createClient();

const getAllProducts = async () => {
  const time =  Math.random() * 10000;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(['Produto 1', 'Produto 2'])
    }, time);
  })
}

app.get('/saved', async (req, res) => {
  await client.del('getAllProducts');
  res.send({ok: true});
})

app.get('/', async function(req, res) {
  const productsFromCache = await client.get('getAllProducts')
  const isProductsFromCacheStale = !(await client.get('getAllProducts:validation'));
  
  if(isProductsFromCacheStale) {
    const isRefetching =  !!(client.get('getAllProducts:is-refetching'));
    console.log('is refetching')
    if(!isRefetching) {
      await client.set('getAllProducts:is-refetching', 'true', {EX: 20})
      console.log('cache is stale - refetching...')
      setTimeout(async () => {
        const products = await getAllProducts();
        await client.set("getAllProducts", JSON.stringify(products));
        await client.set('getAllProducts:validation', 'true', { EX: 5 })
        await client.del('getAllProducts:is-refetching')
      }, 0)
    }  
  }  

  if (productsFromCache) {
    return res.send(JSON.parse(productsFromCache));
  }

  const products = await getAllProducts()  
  await client.set('getAllProducts', JSON.stringify(products));

  res.send(products)
});

const startup = async () => {
  await client.connect()

  app.listen(3000, () => {
    console.log('server running')
  })
}

startup()