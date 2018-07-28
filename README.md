# tumblr-crawler

## 汤不热爬虫

### 使用方法： 
  1. 创建crawler.yml 格式为
  ```
  crawler: 
    cookie: 填入你的cookie
    userAgent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.87 Safari/537.36
    firstUrl: /dashboard/xx/xxx //第一页
    maxPage: 101
  ```

  2. 第一次firstUrl获取方法，打开tumblr首页，打开开发者工具
    找到request 为 https://www.tumblr.com/svc/dashboard/x/xxxx?nextAdPos=2&stream_cursor.....的URL
    复制其中的/dashboard/x/xxxx即为第一次url

  3. 同上 复制request中的cookie

  4. maxPage为本次程序运行的最大页数，并将保存结束时的下次 firstURL，方便再次运行
  
  5. 运行main.js
