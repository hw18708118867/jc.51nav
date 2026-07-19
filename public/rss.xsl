<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes" doctype-system="about:legacy-compat"/>

  <xsl:template match="/">
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title><xsl:value-of select="rss/channel/title"/> · RSS 订阅</title>
        <style>
          :root{
            --brand:#2563eb; --brand-50:#eff6ff; --brand-700:#1d4ed8;
            --slate-50:#f8fafc; --slate-100:#f1f5f9; --slate-200:#e2e8f0;
            --slate-500:#64748b; --slate-600:#475569; --slate-700:#334155; --slate-900:#0f172a;
          }
          *{box-sizing:border-box;}
          body{
            margin:0; background:var(--slate-50); color:var(--slate-700);
            font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;
            line-height:1.6;
          }
          .wrap{max-width:820px; margin:0 auto; padding:32px 20px 64px;}
          header{border-bottom:1px solid var(--slate-200); padding-bottom:20px; margin-bottom:24px;}
          h1{font-size:1.6rem; color:var(--slate-900); margin:0 0 8px;}
          .desc{color:var(--slate-500); margin:0;}
          .box{background:#fff; border:1px solid var(--slate-200); border-radius:14px; padding:16px 18px; margin:20px 0;}
          .box .label{font-size:.8rem; color:var(--slate-500); margin-bottom:8px;}
          .row{display:flex; gap:10px; align-items:center; flex-wrap:wrap;}
          code{
            flex:1; min-width:200px; background:var(--slate-50); border:1px solid var(--slate-200);
            border-radius:8px; padding:8px 10px; font-size:.85rem; color:var(--slate-700); user-select:all;
          }
          button{
            background:var(--brand); color:#fff; border:0; border-radius:8px; padding:8px 14px;
            font-size:.85rem; cursor:pointer; transition:background .2s;
          }
          button:hover{background:var(--brand-700);}
          ul{list-style:none; padding:0; margin:0; display:grid; gap:14px;}
          li{
            background:#fff; border:1px solid var(--slate-200); border-radius:14px; padding:16px 18px;
            transition:border-color .2s, box-shadow .2s;
          }
          li:hover{border-color:#93c5fd; box-shadow:0 6px 20px rgba(37,99,235,.08);}
          .ititle{font-size:1.05rem; font-weight:600; color:var(--slate-900); text-decoration:none;}
          .ititle:hover{color:var(--brand);}
          .meta{font-size:.78rem; color:var(--slate-500); margin:6px 0;}
          .item-desc{font-size:.9rem; color:var(--slate-600); margin:6px 0 0;}
          .cats{margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;}
          .cat{font-size:.72rem; background:var(--brand-50); color:var(--brand-700); border-radius:999px; padding:2px 10px;}
          footer{margin-top:40px; text-align:center; font-size:.8rem; color:var(--slate-500);}
          footer a{color:var(--brand); text-decoration:none;}
          @media (max-width:560px){
            .row{flex-direction:column; align-items:stretch;}
            button{width:100%;}
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <header>
            <h1><xsl:value-of select="rss/channel/title"/></h1>
            <p class="desc"><xsl:value-of select="rss/channel/description"/></p>
          </header>

          <div class="box">
            <div class="label">订阅这个 RSS 源（复制到你的阅读器，如 Feedly / Inoreader / 浏览器 RSS 插件）</div>
            <div class="row">
              <code><xsl:value-of select="rss/channel/link"/>rss.xml</code>
              <button onclick="navigator.clipboard.writeText(location.href); this.textContent='已复制';">复制地址</button>
            </div>
          </div>

          <ul>
            <xsl:for-each select="rss/channel/item">
              <li>
                <a class="ititle" href="{link}"><xsl:value-of select="title"/></a>
                <xsl:if test="pubDate">
                  <div class="meta"><xsl:value-of select="pubDate"/></div>
                </xsl:if>
                <xsl:if test="description">
                  <p class="item-desc"><xsl:value-of select="description"/></p>
                </xsl:if>
                <xsl:if test="category">
                  <div class="cats">
                    <xsl:for-each select="category">
                      <span class="cat"><xsl:value-of select="."/></span>
                    </xsl:for-each>
                  </div>
                </xsl:if>
              </li>
            </xsl:for-each>
          </ul>

          <footer>
            由 <a href="{rss/channel/link}">51教程网</a> 提供 · 共 <xsl:value-of select="count(rss/channel/item)"/> 篇教程
          </footer>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
