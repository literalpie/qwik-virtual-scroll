# Qwik Virtual Scroll

See the demo [here](https://qwik-virtual-scroll-literalpie.vercel.app).

This is a POC showing virtual scrolling and server pagination of a list of data.

**Virtual scrolling**: Only the visible items in the list are rendered in the DOM. In this demo, there's about 6 items rendered at a time.
**Server Pagination**: instead of fetching all data from the server at once, only 50 items at a time are fetched. When you scroll to reveal items that haven't been fetched yet, 50 more items will be fetched.

## Blow My Mind 🤯

Through the magic of Qwik, ZERO JavaScript is evaluated until the moment you scroll.

## How it works

The first "page" of data is loaded on the server and used to generate the HTML shown when you navigate to the page. The initial state of the virtual scrolling list is also calculated on the server.

When you do start scrolling, the appropriate JavaScript is loaded in the browser (this happens quickly because it was most likely cached by the service worker in a background thread before you started scrolling)
