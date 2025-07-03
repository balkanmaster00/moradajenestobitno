require('dotenv').config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ActivityType, Partials } = require('discord.js');
const fetch = require('node-fetch');
const { Buffer } = require('buffer');
const CryptoJS = require('crypto-js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction
  ]
});

const CONFIG = {
  AFF_CODE: process.env.AFFILIATE_CODE || 'YOUR_AFF_CODE',
  ALLOWED_CHANNEL: process.env.ALLOWED_CHANNEL_ID || 'YOUR_CHANNEL_ID',
  SPAM_LIMIT: 3,
  SPAM_WINDOW: 15000,
  EMOJI_MAPPING: {
    taobao: '',
    weidian: '',
    '1688': '',
    kakobuy: '<:kb:1354527507180949615>',
    cnfans: '<:cn:1354527507180949615>',
    joyabuy: '<:jy:1354527507180949615>',
    joyagoo: '<:jg:1354527507180949615>',
    pandabuy: '<:pb:1354527507180949615>',
    mulebuy: '<:mb:1354527507180949615>',
    superbuy: '<:sb:1354527507180949615>',
    cssbuy: '<:cb:1354527507180949615>',
    wegobuy: '<:wb:1354527507180949615>',
    sugargoo: '<:sg:1354527507180949615>',
    hagobuy: '<:hg:1354527507180949615>',
    basetao: '<:bt:1354527507180949615>',
    loongbuy: '<:lb:1354527507180949615>',
    hoobuy: '<:hb:1354527507180949615>',
    acbuy: '<:ab:1354527507180949615>',
    allchinabuy: '<:acb:1354527507180949615>',
    orientdig: '<:od:1354527507180949615>',
    oopbuy: '<:ob:1354527507180949615>',
    ootdbuy: '<:otb:1354527507180949615>',
    lovegobuy: '<:lgb:1354527507180949615>',
    ikako: /ikako\.vip/i,
    yupoo: '<:yp:1354527507180949615>'
  },
  ALLOWED_DOMAINS: {
    taobao: /(taobao\.com|intl\.taobao\.com|m\.taobao\.com|m\.intl\.taobao\.com)/i,
    weidian: /weidian\.com/i,
    '1688': /1688\.com/i,
    kakobuy: /kakobuy\.com/i,
    cnfans: /cnfans\.com/i,
    joyabuy: /joyabuy\.com/i,
    joyagoo: /joyagoo\.com/i,
    pandabuy: /(pandabuy\.com|pandabuy\.page\.link|pandabuy\.allapp\.link|www\.pandabuy\.com|pandabuy\.link|pandabuy\.shop)/i,
    mulebuy: /mulebuy\.com/i,
    superbuy: /superbuy\.com/i,
    cssbuy: /cssbuy\.com\/item-(1688|taobao|weidian)|cssbuy\.com\/item-micro/i,
    wegobuy: /wegobuy\.com/i,
    sugargoo: /sugargoo\.com/i,
    hagobuy: /hagobuy\.com/i,
    basetao: /basetao\.com/i,
    loongbuy: /loongbuy\.com/i,
    hoobuy: /hoobuy\.com/i,
    acbuy: /acbuy\.com/i,
    allchinabuy: /allchinabuy\.com/i,
    orientdig: /orientdig\.com/i,
    oopbuy: /oopbuy\.com/i,
    ootdbuy: /ootdbuy\.com/i,
    lovegobuy: /lovegobuy\.com/i,
    ikako: /ikako\.vip/i,
    yupoo: /yupoo\.com/i
  },
  PLATFORM_MAP: {
    'ALI_1688': '1688',
    'WEIDIAN': 'weidian',
    'TAOBAO': 'taobao',
    'ali_1688': '1688',
    'weidian': 'weidian',
    'taobao': 'taobao',
    'WD': 'weidian',
    'TB': 'taobao',
    1688: '1688'
  },
  SHORT_LINK_PROVIDERS: [
    'pandabuy.page.link',
    'pandabuy.allapp.link',
    'wegobuy.page.link',
    'superbuy.link',
    'cssbuy.link',
    'superbuy.com/en/page/buy'
  ]
};

// Definišemo mapu procesora direktno
const AGENT_PROCESSORS = {
  kakobuy: processKakobuyLink,
  cnfans: processCnfansLink,
  joyabuy: processJoyabuyLink,
  joyagoo: processJoyagooLink,
  pandabuy: processPandabuyLink,
  mulebuy: processMulebuyLink,
  superbuy: processSuperbuyLink,
  cssbuy: processCSSBuyLink,
  wegobuy: processWegobuyLink,
  sugargoo: processSugargooLink,
  hagobuy: processHagobuyLink,
  basetao: processBasetaoLink,
  loongbuy: processLoongbuyLink,
  hoobuy: processHoobuyLink,
  acbuy: processAcbuyLink,
  allchinabuy: processAllchinabuyLink,
  orientdig: processOrientdigLink,
  oopbuy: processOopbuyLink,
  ootdbuy: processOotdbuyLink,
  lovegobuy: processLovegobuyLink,
  ikako: processIkakoLink,
  yupoo: processYupooLink
};

const userLinkCounts = new Map();

client.on('ready', () => {
  console.log(`🤖 Bot ${client.user.tag} je spreman!`);
  
  client.user.setPresence({
    activities: [{ name: 'KakoBuy Srbija', type: ActivityType.Playing }],
    status: 'online'
  });
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== CONFIG.ALLOWED_CHANNEL) return;

  try {
    const userId = message.author.id;
    const allUrls = extractAllUrls(message.content);
    const { validLinks, invalidUrls } = await processUrls(allUrls);

    if (invalidUrls.length > 0) {
      const messages = invalidUrls.map(({ message }) => message);
      await message.reply({
        content: messages.join('\n'),
        allowedMentions: { repliedUser: false }
      });
      return;
    }

    if (validLinks.length > 0 && handleSpamDetection(userId, validLinks)) {
      await punishUser(message);
      return;
    }

    const { conversions, buttons } = generateLinks(validLinks);
    
    if (conversions.length > 0) {
      const actionRows = chunkArray(buttons, 5).map(chunk => 
        new ActionRowBuilder().addComponents(chunk)
      );

      await message.reply({
        content: [
          `${message.author}, uspešno smo konvertovali vaš link! Srećna kupovina!`,
        ].join('\n'),
        components: actionRows,
        allowedMentions: { repliedUser: true }
      });
    }
  } catch (error) {
    await message.reply('❌ Došlo je do greške prilikom obrade linkova.').catch(() => {});
  }
});

async function processUrls(urls) {
  const validLinks = [];
  const invalidUrls = [];

  for (const url of urls) {
    let processed = false;

    // Prvo proveravamo da li je direktan link sa platforme
    const platform = getPlatformFromUrl(url);
    if (platform) {
      const cleaned = cleanUrl(url, platform);
      if (cleaned) {
        validLinks.push({
          original: url,
          cleaned: cleaned,
          platform: platform,
          needsAffiliate: true
        });
        processed = true;
      }
    }

    if (processed) continue;

    // Provera za agente
    for (const [agent, processor] of Object.entries(AGENT_PROCESSORS)) {
      if (CONFIG.ALLOWED_DOMAINS[agent] && CONFIG.ALLOWED_DOMAINS[agent].test(url)) {
        try {
          const result = await processor(url);
          if (result) {
            validLinks.push(result);
            processed = true;
            break;
          }
        } catch (error) {
          // Ignorišemo greške
        }
      }
    }

    if (!processed) {
      // Provera za short linkove
      if (url.includes('allapp.link') || url.includes('page.link')) {
        invalidUrls.push({
          url: url,
          message: "🚫 Nepodržan tip linka. Molimo koristite direktan link sa platforme ili link od podržanog agenta."
        });
      } else {
        invalidUrls.push({
          url: url,
          message: `🚫 Nepodržan link. Podržani agenti: ${Object.keys(AGENT_PROCESSORS).filter(agent => agent !== 'yupoo').join(', ')}`
        });
      }
    }
  }

  return { validLinks, invalidUrls };
}

async function processKakobuyLink(url) {
  try {
    const urlObj = new URL(url);
    const encodedUrl = urlObj.searchParams.get('url');
    if (!encodedUrl) return null;
    
    const decodedUrl = decodeURIComponent(encodedUrl);
    const platform = getPlatformFromUrl(decodedUrl);
    if (!platform) return null;
    
    return {
      original: url,
      cleaned: decodedUrl,
      platform: platform,
      needsAffiliate: !urlObj.searchParams.has('affcode'),
      source: 'kakobuy'
    };
  } catch (error) {
    return null;
  }
}

async function processCnfansLink(url) {
  try {
    // Prvo dekodiramo URL da bismo dobili čist string
    let decodedUrl = decodeURIComponent(url);
    
    // Tražimo ID u celom stringu
    const idMatch = decodedUrl.match(/id[=%](\d+)/i);
    if (!idMatch) return null;
    
    const id = idMatch[1];
    if (!id) return null;

    // Podrazumevano je weidian
    let platform = 'weidian';
    
    // Ako URL sadrži reč taobao ili 1688, menjamo platformu
    if (decodedUrl.toLowerCase().includes('taobao')) platform = 'taobao';
    else if (decodedUrl.toLowerCase().includes('1688')) platform = '1688';

    let cleanedUrl;
    switch(platform) {
      case 'weidian':
        cleanedUrl = `https://weidian.com/item.html?itemID=${id}`;
        break;
      case 'taobao':
        cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`;
        break;
      case '1688':
        cleanedUrl = `https://detail.1688.com/offer/${id}.html`;
        break;
      default:
        return null;
    }

    return {
      original: url,
      cleaned: cleanedUrl,
      platform: platform,
      needsAffiliate: true,
      source: 'cnfans'
    };
  } catch (error) {
    return null;
  }
}

async function processJoyabuyLink(url) {
  try {
    const urlObj = new URL(url);
    
    // Provera za format sa shop_type i id parametrima
    const shopType = urlObj.searchParams.get('shop_type');
    const id = urlObj.searchParams.get('id');
    
    if (shopType && id) {
      const platform = CONFIG.PLATFORM_MAP[shopType.toLowerCase()];
      if (!platform) return null;
      
      let cleanedUrl;
      switch(platform) {
        case 'weidian':
          cleanedUrl = `https://weidian.com/item.html?itemID=${id}`;
          break;
        case 'taobao':
          cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`;
          break;
        case '1688':
          cleanedUrl = `https://detail.1688.com/offer/${id}.html`;
          break;
        default:
          return null;
      }
      
      return {
        original: url,
        cleaned: cleanedUrl,
        platform: platform,
        needsAffiliate: true,
        source: 'joyabuy'
      };
    }
    
    // Provera za stari format (url parametar)
    const encodedUrl = urlObj.searchParams.get('url');
    if (!encodedUrl) return null;
    
    const decodedUrl = decodeURIComponent(encodedUrl);
    const platform = getPlatformFromUrl(decodedUrl);
    if (!platform) return null;
    
    return {
      original: url,
      cleaned: decodedUrl,
      platform: platform,
      needsAffiliate: true,
      source: 'joyabuy'
    };
  } catch (error) {
    return null;
  }
}

async function processJoyagooLink(url) {
  try {
    const urlObj = new URL(url);
    const id = urlObj.searchParams.get('id');
    const platformParam = urlObj.searchParams.get('shop_type');
    
    if (!id || !platformParam) return null;
    
    const platform = CONFIG.PLATFORM_MAP[platformParam.toLowerCase()];
    if (!platform) return null;

    let cleanedUrl;
    switch(platform) {
      case '1688':
        cleanedUrl = `https://detail.1688.com/offer/${id}.html`;
        break;
      case 'weidian':
        cleanedUrl = `https://weidian.com/item.html?itemID=${id}`;
        break;
      case 'taobao':
        cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`;
        break;
      default:
        return null;
    }

    return {
      original: url,
      cleaned: cleanedUrl,
      platform: platform,
      needsAffiliate: true,
      source: 'joyagoo'
    };
  } catch (error) {
    return null;
  }
}

// Funkcija za dekodiranje Pandabuy URL-a
function decryptPandabuy(encodedString) {
    const d = 'PJ';
    const match = new RegExp(`^${d}(\\d)([a-zA-Z])(.*)`).exec(encodedString);
    if (!match) {
        console.error("Pogrešan format stringa!");
        return null;
    }

    const id = parseInt(match[1], 10);
    const encodedUrl = match[3];
    const decodedUrl = decodeURIComponent(encodedUrl);
    const decodedBase64 = CryptoJS.enc.Base64.parse(decodedUrl);

    // Pretvaranje u byte array
    const byteArray = CryptoJS.lib.WordArray.create(decodedBase64.words, decodedBase64.sigBytes);
    const byteArr = byteArray.toString(CryptoJS.enc.Latin1);

    // Uklanjamo bajt na poziciji ID-a
    const modifiedByteArr = byteArr.substring(0, id) + byteArr.substring(id + 1);
    const modifiedWordArray = CryptoJS.enc.Latin1.parse(modifiedByteArr);

    // Ključevi i IV za dekripciju
    const keyIvPairs = [
        { id: '0', iv: 'a12sdcft', key: 'kj098765' },
        { id: '1', iv: 'mbio986h', key: 'plk;9uhj' },
        { id: '2', iv: '09ydnlp;', key: '.1asxz4t' },
        { id: '3', iv: '0om,.;0s', key: '1qasdr56' },
        { id: '4', iv: '1dafmdl0', key: '1wdfgu8i' },
        { id: '5', iv: '90oikjhg', key: '12zxcvbn' },
        { id: '6', iv: 'lkjuy678', key: '1jnbop9g' },
        { id: '7', iv: '1whsnxk9', key: '378ujhgr' },
        { id: '8', iv: '1was;09n', key: 'chguikl0' },
        { id: '9', iv: '12sdfghy', key: '09jnbgft' },
    ];
    
    const keyIv = keyIvPairs.find(pair => pair.id === id.toString());
    if (!keyIv) {
        console.error("Nevažeći ID za ključ/IV!");
        return null;
    }

    const key = CryptoJS.enc.Utf8.parse(keyIv.key);
    const iv = CryptoJS.enc.Utf8.parse(keyIv.iv);

    // DES dekripcija
    const decryptedData = CryptoJS.DES.decrypt(
        { ciphertext: modifiedWordArray },
        key,
        { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );

    return decryptedData.toString(CryptoJS.enc.Utf8);
}

async function processPandabuyLink(url) {
  try {
    // Prvo pratimo redirect ako je short link
    if (url.includes('pandabuy.page.link') || url.includes('pandabuy.allapp.link')) {
      const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
      if ([301, 302].includes(response.status)) {
        return await processPandabuyLink(response.headers.get('location'));
      }
    }

    const urlObj = new URL(url);
    
    // Provera za www.pandabuy.com/product format
    if (urlObj.pathname === '/product' && urlObj.searchParams.has('url')) {
      const encodedUrl = urlObj.searchParams.get('url');
      const decodedUrl = decodeURIComponent(encodedUrl);
      const platform = getPlatformFromUrl(decodedUrl);
      
      if (platform) {
        const cleaned = cleanUrl(decodedUrl, platform);
        if (cleaned) {
          return {
            original: url,
            cleaned: cleaned,
            platform: platform,
            needsAffiliate: true,
            source: 'pandabuy'
          };
        }
      }
    }
    
    // Provera za standardni format
    const encodedUrl = urlObj.searchParams.get('url');
    if (!encodedUrl) return null;
    
    // Pokušavamo da dekodiramo URL
    const decodedUrl = decryptPandabuy(encodedUrl);
    if (!decodedUrl) return null;
    
    // Određujemo platformu iz dekodiranog URL-a
    const platform = getPlatformFromUrl(decodedUrl);
    if (!platform) return null;
    
    return {
      original: url,
      cleaned: decodedUrl,
      platform: platform,
      needsAffiliate: true,
      source: 'pandabuy'
    };
  } catch (error) {
    return null;
  }
}

async function processMulebuyLink(url) {
  try {
    const urlObj = new URL(url);
    
    // Provera za format sa shop_type i id parametrima
    const shopType = urlObj.searchParams.get('shop_type');
    const id = urlObj.searchParams.get('id');
    
    if (shopType && id) {
      const platform = CONFIG.PLATFORM_MAP[shopType.toLowerCase()];
      if (!platform) return null;
      
      let cleanedUrl;
      switch(platform) {
        case 'weidian':
          cleanedUrl = `https://weidian.com/item.html?itemID=${id}`;
          break;
        case 'taobao':
          cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`;
          break;
        case '1688':
          cleanedUrl = `https://detail.1688.com/offer/${id}.html`;
          break;
        default:
          return null;
      }
      
      return {
        original: url,
        cleaned: cleanedUrl,
        platform: platform,
        needsAffiliate: true,
        source: 'mulebuy'
      };
    }
    
    // Provera za stari format (url parametar)
    const encodedUrl = urlObj.searchParams.get('url');
    if (!encodedUrl) return null;
    
    const decodedUrl = decodeURIComponent(encodedUrl);
    const platform = getPlatformFromUrl(decodedUrl);
    if (!platform) return null;
    
    return {
      original: url,
      cleaned: decodedUrl,
      platform: platform,
      needsAffiliate: true,
      source: 'mulebuy'
    };
  } catch (error) {
    return null;
  }
}

async function processSuperbuyLink(url) {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.pathname.includes('/item/')) {
      const id = urlObj.pathname.split('/').pop();
      if (id) {
        return {
          original: url,
          cleaned: `https://www.superbuy.com/item/${id}`,
          platform: 'superbuy',
          needsAffiliate: true
        };
      }
    }
    
    if (urlObj.searchParams.has('url')) {
      const decodedUrl = decodeURIComponent(urlObj.searchParams.get('url'));
      const platform = getPlatformFromUrl(decodedUrl);
      
      if (platform) {
        return {
          original: url,
          cleaned: decodedUrl,
          platform: platform,
          needsAffiliate: true,
          source: 'superbuy'
        };
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function processCSSBuyLink(url) {
  try {
    const urlObj = new URL(url);
    
    // Provera za mikro format
    const microMatch = urlObj.pathname.match(/\/item-micro-(\d+)\.html/);
    if (microMatch) {
      const id = microMatch[1];
      return {
        original: url,
        cleaned: `https://weidian.com/item.html?itemID=${id}`,
        platform: 'weidian',
        needsAffiliate: true,
        source: 'cssbuy'
      };
    }
    
    // Provera za standardni format
    const pathMatch = urlObj.pathname.match(/\/item-(1688|taobao|weidian)-(\d+)\.html/);
    if (pathMatch) {
      const platform = pathMatch[1];
      const id = pathMatch[2];
      let cleanedUrl;
      
      switch(platform) {
        case '1688': cleanedUrl = `https://detail.1688.com/offer/${id}.html`; break;
        case 'weidian': cleanedUrl = `https://weidian.com/item.html?itemID=${id}`; break;
        case 'taobao': cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`; break;
        default: return null;
      }
      
      return {
        original: url,
        cleaned: cleanedUrl,
        platform: platform,
        needsAffiliate: true,
        source: 'cssbuy'
      };
    }

    // Provera za url parametar
    if (urlObj.searchParams.has('url')) {
      const decodedUrl = decodeURIComponent(urlObj.searchParams.get('url'));
      const platform = getPlatformFromUrl(decodedUrl);
      if (platform) {
        return {
          original: url,
          cleaned: decodedUrl,
          platform: platform,
          needsAffiliate: true,
          source: 'cssbuy'
        };
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function processWegobuyLink(url) {
  try {
    if (CONFIG.SHORT_LINK_PROVIDERS.some(domain => url.includes(domain))) {
      const response = await fetch(url, { method: 'HEAD', redirect: 'manual' });
      if ([301, 302].includes(response.status)) {
        return await processWegobuyLink(response.headers.get('location'));
      }
    }

    const urlObj = new URL(url);
    if (urlObj.searchParams.has('url')) {
      const decodedUrl = decodeURIComponent(urlObj.searchParams.get('url'));
      const platform = getPlatformFromUrl(decodedUrl);
      if (platform) {
        return {
          original: url,
          cleaned: decodedUrl,
          platform: platform,
          needsAffiliate: true,
          source: 'wegobuy'
        };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function processSugargooLink(url) {
  try {
    const urlObj = new URL(url);
    
    // Provera za format sa hash i productLink parametrom
    if (urlObj.hash) {
      // Uklanjamo # iz hash dela
      const hashPart = urlObj.hash.substring(1);
      
      // Pokušavamo da pronađemo productLink u hash delu
      const hashParams = new URLSearchParams(hashPart.split('?')[1]);
      const productLink = hashParams.get('productLink');
      
      if (productLink) {
        const decodedUrl = decodeURIComponent(productLink);
        const platform = getPlatformFromUrl(decodedUrl);
        if (platform) {
          const cleaned = cleanUrl(decodedUrl, platform);
          if (cleaned) {
            return {
              original: url,
              cleaned: cleaned,
              platform: platform,
              needsAffiliate: true,
              source: 'sugargoo'
            };
          }
        }
      }
    }
    
    // Provera za stari format (url parametar)
    if (urlObj.searchParams.has('url')) {
      const decodedUrl = decodeURIComponent(urlObj.searchParams.get('url'));
      const platform = getPlatformFromUrl(decodedUrl);
      if (platform) {
        const cleaned = cleanUrl(decodedUrl, platform);
        if (cleaned) {
          return {
            original: url,
            cleaned: cleaned,
            platform: platform,
            needsAffiliate: true,
            source: 'sugargoo'
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function processHagobuyLink(url) {
  try {
    const urlObj = new URL(url);
    if (urlObj.searchParams.has('url')) {
      const decodedUrl = decodeURIComponent(urlObj.searchParams.get('url'));
      const platform = getPlatformFromUrl(decodedUrl);
      if (platform) {
        return {
          original: url,
          cleaned: decodedUrl,
          platform: platform,
          needsAffiliate: true,
          source: 'hagobuy'
        };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function processBasetaoLink(url) {
  try {
    const urlObj = new URL(url);
    
    // Provera za format /products/agent/{platform}/{id}.html
    const pathMatch = urlObj.pathname.match(/\/products\/agent\/(\w+)\/(\d+)\.html/);
    if (pathMatch) {
      const platform = CONFIG.PLATFORM_MAP[pathMatch[1].toLowerCase()];
      const id = pathMatch[2];
      
      if (!platform || !id) return null;
      
      let cleanedUrl;
      switch(platform) {
        case 'weidian':
          cleanedUrl = `https://weidian.com/item.html?itemID=${id}`;
          break;
        case 'taobao':
          cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`;
          break;
        case '1688':
          cleanedUrl = `https://detail.1688.com/offer/${id}.html`;
          break;
        default:
          return null;
      }
      
      return {
        original: url,
        cleaned: cleanedUrl,
        platform: platform,
        needsAffiliate: true,
        source: 'basetao'
      };
    }
    
    // Provera za url parametar (stari format)
    if (urlObj.searchParams.has('url')) {
      const decodedUrl = decodeURIComponent(urlObj.searchParams.get('url'));
      const platform = getPlatformFromUrl(decodedUrl);
      if (platform) {
        return {
          original: url,
          cleaned: decodedUrl,
          platform: platform,
          needsAffiliate: true,
          source: 'basetao'
        };
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function processLoongbuyLink(url) {
  try {
    const urlObj = new URL(url);
    const encodedUrl = urlObj.searchParams.get('url');
    if (!encodedUrl) return null;
    
    const decodedUrl = decodeURIComponent(encodedUrl);
    const platform = getPlatformFromUrl(decodedUrl);
    if (!platform) return null;
    
    return {
      original: url,
      cleaned: decodedUrl,
      platform: platform,
      needsAffiliate: true,
      source: 'loongbuy'
    };
  } catch (error) {
    return null;
  }
}

async function processHoobuyLink(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const id = pathParts[pathParts.length - 1];
    
    if (!id) return null;
    
    return {
      original: url,
      cleaned: `https://weidian.com/item.html?itemID=${id}`,
      platform: 'weidian',
      needsAffiliate: true,
      source: 'hoobuy'
    };
  } catch (error) {
    return null;
  }
}

async function processAcbuyLink(url) {
  try {
    const urlObj = new URL(url);
    const id = urlObj.searchParams.get('id');
    const source = urlObj.searchParams.get('source');
    
    if (!id || !source) return null;
    
    const platform = CONFIG.PLATFORM_MAP[source] || 'weidian';
    
    let cleanedUrl;
    switch(platform) {
      case 'weidian': 
        cleanedUrl = `https://weidian.com/item.html?itemID=${id}`; 
        break;
      case 'taobao': 
        cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`; 
        break;
      case '1688': 
        cleanedUrl = `https://detail.1688.com/offer/${id}.html`; 
        break;
      default: 
        return null;
    }
    
    return {
      original: url,
      cleaned: cleanedUrl,
      platform: platform,
      needsAffiliate: true,
      source: 'acbuy'
    };
  } catch (error) {
    return null;
  }
}

function cleanWeidianUrl(url) {
  try {
    const urlObj = new URL(url);
    const itemId = urlObj.searchParams.get('itemId');
    if (!itemId) return url;
    
    // Ako ima više itemId parametara, uzimamo prvi
    const cleanItemId = itemId.split('?')[0];
    return `https://weidian.com/item.html?itemID=${cleanItemId}`;
  } catch (error) {
    return url;
  }
}

async function processAllchinabuyLink(url) {
  try {
    const urlObj = new URL(url);
    const encodedUrl = urlObj.searchParams.get('url');
    if (!encodedUrl) return null;
    
    const decodedUrl = decodeURIComponent(encodedUrl);
    const platform = getPlatformFromUrl(decodedUrl);
    if (!platform) return null;
    
    // Čistimo URL ako je Weidian
    const cleanedUrl = platform === 'weidian' ? cleanWeidianUrl(decodedUrl) : decodedUrl;
    
    return {
      original: url,
      cleaned: cleanedUrl,
      platform: platform,
      needsAffiliate: true,
      source: 'allchinabuy'
    };
  } catch (error) {
    return null;
  }
}

async function processOrientdigLink(url) {
  try {
    // Provera za Google redirect link
    if (url.includes('google.com/url')) {
      const urlObj = new URL(url);
      const redirectUrl = urlObj.searchParams.get('q');
      if (!redirectUrl) return null;
      
      // Dekodiramo URL i proveravamo da li je Orientdig link
      const decodedUrl = decodeURIComponent(redirectUrl);
      if (!decodedUrl.includes('orientdig.com')) return null;
      
      // Procesiramo dekodirani URL
      const orientdigUrlObj = new URL(decodedUrl);
      const id = orientdigUrlObj.searchParams.get('id');
      const shopType = orientdigUrlObj.searchParams.get('shop_type');
      
      if (!id || !shopType) return null;
      
      const platform = CONFIG.PLATFORM_MAP[shopType.toLowerCase()];
      if (!platform) return null;

      let cleanedUrl;
      switch(platform) {
        case '1688':
          cleanedUrl = `https://detail.1688.com/offer/${id}.html`;
          break;
        case 'weidian':
          cleanedUrl = `https://weidian.com/item.html?itemID=${id}`;
          break;
        case 'taobao':
          cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`;
          break;
        default:
          return null;
      }

      return {
        original: url,
        cleaned: cleanedUrl,
        platform: platform,
        needsAffiliate: true,
        source: 'orientdig'
      };
    }

    // Standardni Orientdig link
    const urlObj = new URL(url);
    const id = urlObj.searchParams.get('id');
    const platformParam = urlObj.searchParams.get('platform') || urlObj.searchParams.get('shop_type');
    
    if (!id || !platformParam) return null;
    
    const platform = CONFIG.PLATFORM_MAP[platformParam.toLowerCase()];
    if (!platform) return null;

    let cleanedUrl;
    switch(platform) {
      case '1688':
        cleanedUrl = `https://detail.1688.com/offer/${id}.html`;
        break;
      case 'weidian':
        cleanedUrl = `https://weidian.com/item.html?itemID=${id}`;
        break;
      case 'taobao':
        cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`;
        break;
      default:
        return null;
    }

    return {
      original: url,
      cleaned: cleanedUrl,
      platform: platform,
      needsAffiliate: true,
      source: 'orientdig'
    };
  } catch (error) {
    return null;
  }
}

async function processOopbuyLink(url) {
  try {
    const urlObj = new URL(url);
    const id = urlObj.searchParams.get('id');
    const channel = urlObj.searchParams.get('channel') || 'weidian';
    
    if (!id) return null;
    
    const platform = CONFIG.PLATFORM_MAP[channel.toLowerCase()];
    if (!platform) return null;

    let cleanedUrl;
    switch(platform) {
      case 'weidian':
        cleanedUrl = `https://weidian.com/item.html?itemID=${id}`;
        break;
      case 'taobao':
        cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`;
        break;
      case '1688':
        cleanedUrl = `https://detail.1688.com/offer/${id}.html`;
        break;
      default:
        return null;
    }

    return {
      original: url,
      cleaned: cleanedUrl,
      platform: platform,
      needsAffiliate: true,
      source: 'oopbuy'
    };
  } catch (error) {
    return null;
  }
}

async function processOotdbuyLink(url) {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.pathname.includes('/goods/details')) {
      const id = urlObj.searchParams.get('id');
      const channel = urlObj.searchParams.get('channel') || 'weidian';
      const platform = CONFIG.PLATFORM_MAP[channel.toLowerCase()];
      
      if (!id || !platform) return null;

      let cleanedUrl;
      switch(platform) {
        case 'weidian':
          cleanedUrl = `https://weidian.com/item.html?itemID=${id}`;
          break;
        case 'taobao':
          cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`;
          break;
        case '1688':
          cleanedUrl = `https://detail.1688.com/offer/${id}.html`;
          break;
        default:
          return null;
      }

      return {
        original: url,
        cleaned: cleanedUrl,
        platform: platform,
        needsAffiliate: true,
        source: 'ootdbuy'
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function processLovegobuyLink(url) {
  try {
    const urlObj = new URL(url);
    const id = urlObj.searchParams.get('id');
    const platformParam = urlObj.searchParams.get('platform') || urlObj.searchParams.get('shop_type');
    
    if (!id || !platformParam) return null;
    
    const platform = CONFIG.PLATFORM_MAP[platformParam.toLowerCase()];
    if (!platform) return null;

    let cleanedUrl;
    switch(platform) {
      case '1688':
        cleanedUrl = `https://detail.1688.com/offer/${id}.html`;
        break;
      case 'weidian':
        cleanedUrl = `https://weidian.com/item.html?itemID=${id}`;
        break;
      case 'taobao':
        cleanedUrl = `https://item.taobao.com/item.htm?id=${id}`;
        break;
      default:
        return null;
    }

    return {
      original: url,
      cleaned: cleanedUrl,
      platform: platform,
      needsAffiliate: true,
      source: 'lovegobuy'
    };
  } catch (error) {
    return null;
  }
}

function cleanUrl(url, platform) {
  try {
    const urlObj = new URL(url);
    
    switch(platform) {
      case 'taobao':
        // Prvo proveravamo da li je login link sa redirect URL-om
        if (urlObj.pathname.includes('/login.htm') && urlObj.searchParams.has('redirectURL')) {
          const redirectUrl = decodeURIComponent(urlObj.searchParams.get('redirectURL'));
          const redirectUrlObj = new URL(redirectUrl);
          const id = redirectUrlObj.searchParams.get('id');
          if (id) {
            return `https://item.taobao.com/item.htm?id=${id}`;
          }
        }
        
        // Tražimo ID u svim mogućim formatima
        const id = urlObj.searchParams.get('id') || 
                  urlObj.searchParams.get('itemId') ||
                  urlObj.pathname.split('/').find(part => /^\d+$/.test(part));
        
        // Ako imamo ID, konvertujemo u standardni format
        if (id) {
          return `https://item.taobao.com/item.htm?id=${id}`;
        }
        
        // Ako nemamo ID, proveravamo da li je mobilni format
        if (urlObj.hostname.includes('m.') || urlObj.hostname.includes('intl.')) {
          const pathParts = urlObj.pathname.split('/');
          const detailIndex = pathParts.findIndex(part => part === 'detail');
          if (detailIndex !== -1 && pathParts[detailIndex + 1] === 'detail.html') {
            const id = urlObj.searchParams.get('id');
            if (id) {
              return `https://item.taobao.com/item.htm?id=${id}`;
            }
          }
        }
        
        return null;
      
      case 'weidian':
        const itemID = urlObj.searchParams.get('itemID') || 
                      urlObj.searchParams.get('itemId') ||
                      urlObj.pathname.split('/').find(part => /^\d+$/.test(part));
        return itemID ? `https://weidian.com/item.html?itemID=${itemID}` : null;
      
      case '1688':
        // Tražimo ID u različitim formatima
        const offerId = urlObj.pathname.split('/').find(part => /^\d+$/.test(part)) ||
                       urlObj.searchParams.get('offerId') ||
                       urlObj.searchParams.get('id') ||
                       urlObj.pathname.match(/\/offer\/(\d+)/)?.[1];
        
        if (offerId) {
          return `https://detail.1688.com/offer/${offerId}.html`;
        }
        
        // Ako nemamo ID u standardnom formatu, proveravamo da li je mobilni format
        if (urlObj.hostname.includes('m.')) {
          const pathParts = urlObj.pathname.split('/');
          const offerIndex = pathParts.findIndex(part => part === 'offer');
          if (offerIndex !== -1 && pathParts[offerIndex + 1]) {
            return `https://detail.1688.com/offer/${pathParts[offerIndex + 1]}.html`;
          }
        }
        
        return null;
      
      default:
        return null;
    }
  } catch (error) {
    return null;
  }
}

function getPlatformFromUrl(url) {
  try {
    // Prvo proveravamo agente
    for (const [platform, regex] of Object.entries(CONFIG.ALLOWED_DOMAINS)) {
      if (!Object.keys(AGENT_PROCESSORS).includes(platform) && regex.test(url)) {
        return platform;
      }
    }
    
    // Provera za 1688 linkove
    if (url.includes('1688.com')) {
      // Provera za detaljne stranice
      if (url.includes('detail.1688.com/offer/')) return '1688';
      if (url.includes('detail.1688.com')) return '1688';
      
      // Provera za mobilne verzije
      if (url.includes('m.1688.com')) return '1688';
      
      // Provera za direktne linkove
      if (url.includes('1688.com/offer/')) return '1688';
      
      // Provera za offer ID
      if (url.match(/\/offer\/\d+\.html/)) return '1688';
      
      // Provera za alternativne formate
      if (url.includes('1688.com')) return '1688';
    }
    
    // Provera za Taobao linkove
    if (url.includes('taobao.com')) {
      if (url.includes('item.taobao.com/item.htm')) return 'taobao';
      if (url.includes('m.taobao.com') || url.includes('m.intl.taobao.com')) return 'taobao';
      if (url.includes('taobao.com/item.htm')) return 'taobao';
      if (url.includes('item.taobao.com')) return 'taobao';
      if (url.includes('taobao.com/item')) return 'taobao';
      if (url.match(/\/item\.htm\?id=\d+/)) return 'taobao';
    }
    
    // Provera za Weidian linkove
    if (url.includes('weidian.com')) {
      if (url.includes('weidian.com/item.html')) return 'weidian';
      if (url.includes('m.weidian.com')) return 'weidian';
      if (url.includes('weidian.com/item.html')) return 'weidian';
      if (url.includes('weidian.com/item')) return 'weidian';
      if (url.match(/\/item\.html\?itemID=\d+/)) return 'weidian';
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function punishUser(message) {
  try {
    const member = message.member;
    if (!member) return;

    if (member.id === member.guild.ownerId) return;
    if (!member.moderatable) return;
    if (member.roles.highest.position >= message.guild.members.me.roles.highest.position) return;

    await member.timeout(60000, "Spamovanje linkovima");
    await message.reply({
      content: `⚠️ ${member} Prekoračili ste limit za slanje linkova! (1 minut zabrane)`,
      allowedMentions: { users: [member.id] }
    });
  } catch (error) {
    // Ignorišemo greške
  }
}

function extractAllUrls(content) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return [...new Set(content.match(urlRegex) || [])];
}

function handleSpamDetection(userId, links) {
  const now = Date.now();
  let userData = userLinkCounts.get(userId) || { 
    counts: new Map(), 
    lastMessageTime: 0,
    timeout: null
  };

  if (now - userData.lastMessageTime > CONFIG.SPAM_WINDOW) {
    userData = { counts: new Map(), lastMessageTime: now, timeout: null };
  }

  let isSpam = false;
  links.forEach(({ original }) => {
    const count = userData.counts.get(original) || 0;
    userData.counts.set(original, count + 1);
    if (count + 1 >= CONFIG.SPAM_LIMIT) isSpam = true;
  });

  userData.lastMessageTime = now;
  clearTimeout(userData.timeout);
  userData.timeout = setTimeout(() => userLinkCounts.delete(userId), CONFIG.SPAM_WINDOW);
  userLinkCounts.set(userId, userData);
  
  return isSpam;
}

function generateLinks(validLinks) {
  const conversions = [];
  const buttons = [];

  validLinks.forEach(({ cleaned, platform, needsAffiliate, source }) => {
    try {
      const finalUrl = `https://www.kakobuy.com/item/details?url=${encodeURIComponent(cleaned)}${needsAffiliate ? `&affcode=${CONFIG.AFF_CODE}` : ''}`;
      const emoji = CONFIG.EMOJI_MAPPING[platform] || '🔗';
      const sourceIndicator = source ? ` (${source})` : '';
      
      conversions.push(
        `${emoji} ${platform.toUpperCase()}${sourceIndicator}: ${finalUrl}`
      );
      
      buttons.push(
        new ButtonBuilder()
          .setLabel(`${platform.toUpperCase()}`)
          .setURL(cleaned)
          .setStyle(ButtonStyle.Link)
          .setEmoji(emoji)
      );
      
      buttons.push(
        new ButtonBuilder()
          .setLabel('KakoBuy')
          .setURL(finalUrl)
          .setStyle(ButtonStyle.Link)
          .setEmoji(CONFIG.EMOJI_MAPPING.kakobuy)
      );
    } catch(error) {
      // Ignorišemo greške
    }
  });

  return { conversions, buttons };
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function processIkakoLink(url) {
  try {
    // Prvo pratimo redirect da dobijemo pravi URL
    const response = await fetch(url, { 
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) return null;

    const finalUrl = response.url;
    if (!finalUrl) return null;

    // Proveravamo da li je finalni URL od nekog podržanog agenta
    for (const [agent, processor] of Object.entries(AGENT_PROCESSORS)) {
      if (agent === 'ikako') continue; // Preskačemo ikako da izbegnemo beskonačnu petlju
      if (CONFIG.ALLOWED_DOMAINS[agent] && CONFIG.ALLOWED_DOMAINS[agent].test(finalUrl)) {
        return await processor(finalUrl);
      }
    }

    // Ako nije agent link, proveravamo da li je direktan link sa platforme
    const platform = getPlatformFromUrl(finalUrl);
    if (platform) {
      const cleaned = cleanUrl(finalUrl, platform);
      if (cleaned) {
        return {
          original: url,
          cleaned: cleaned,
          platform: platform,
          needsAffiliate: true,
          source: 'ikako'
        };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function processYupooLink(url) {
  try {
    const urlObj = new URL(url);
    
    // Provera za external URL format
    if (urlObj.pathname === '/external' && urlObj.searchParams.has('url')) {
      const encodedUrl = urlObj.searchParams.get('url');
      const decodedUrl = decodeURIComponent(encodedUrl);
      const platform = getPlatformFromUrl(decodedUrl);
      
      if (platform) {
        const cleaned = cleanUrl(decodedUrl, platform);
        if (cleaned) {
          return {
            original: url,
            cleaned: cleaned,
            platform: platform,
            needsAffiliate: true,
            source: 'yupoo'
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

//console.log('Token iz .env:', process.env.DISCORD_TOKEN);

client.login(process.env.DISCORD_TOKEN).catch(err => {
  console.error('Greška pri prijavljivanju bota:', err);
  process.exit(1);
});

process.on('unhandledRejection', error => {
  console.error('Neobrađena greška:', error);
});

process.on('uncaughtException', error => {
  console.error('Neuhvaćena greška:', error);
});
