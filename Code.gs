/**
 * ============================================================
 * আদর্শ আল মাস ছাত্রাবাস
 * বর্ডার হিসাব ব্যবস্থাপনা
 * Google Apps Script Backend
 * ============================================================
 *
 * Google Sheets:
 * 1. ওয়েবসাইট confi.
 * 2. টাকার হিসাব
 * 3. চালের হিসাব
 *
 * প্রথমবার:
 * 1. setupSheets() Run
 * 2. Web App Deploy
 *
 * Fixed Admin Password:
 * 180665
 * ============================================================
 */


/* ============================================================
   BASIC CONFIG
   ============================================================ */

const SPREADSHEET_ID =
  '1_sOWw0y_PtlD_FnccVpvt5Pydm469fiIKDP5Fc5bOU4';

const SHEETS = {
  CONFIG: 'ওয়েবসাইট confi.',
  MONEY: 'টাকার হিসাব',
  RICE: 'চালের হিসাব'
};

/* Fixed Admin Password (Cannot be changed) */
const FIXED_ADMIN_PASSWORD = '180665';
const FIXED_ADMIN_PASSWORD_HASH = sha256_(FIXED_ADMIN_PASSWORD);


/* ============================================================
   CONFIG KEYS
   ============================================================ */

const CONFIG_KEYS = {
  HOSTEL_NAME: 'hostelName',
  ADDRESS: 'hostelAddress',
  DEVELOPER: 'developer',
  DEVELOPER_FB: 'developerFbUrl',
  LOGO: 'hostelLogoUrl',
  APP_SCRIPT_URL: 'appScriptUrl',
  SLIDER_IMAGES: 'sliderImages',
  MONTH: 'currentMonth',
  YEAR: 'currentYear',
  MEAL_RATE: 'defaultMealRate'
};


/* ============================================================
   SHEET HEADERS
   ============================================================ */

const CONFIG_HEADERS = [
  'কী (Key)',
  'মান (Value)'
];

const MONEY_HEADERS = [
  'ক্রো. নং',
  'বর্ডারের নাম',
  'মিল সংখ্যা',
  'মিল রেট',
  'মিল খরচ',
  'অতিরিক্ত',
  'বিবিধ',
  'মোট খরচ',
  'মোট জমা',
  'ম্যানেজার পাবে',
  'বর্ডার পাবে'
];

const RICE_HEADERS = [
  'ক্রো. নং',
  'বর্ডারের নাম',
  'মিল খরচ',
  'অতিরিক্ত',
  'মোট খরচ',
  'মোট জমা',
  'ম্যানেজার পাবে',
  'বর্ডার পাবে'
];


/* ============================================================
   GET API
   ============================================================ */

function doGet(e) {

  try {

    const params =
      e && e.parameter
        ? e.parameter
        : {};

    const action =
      params.action ||
      'getAllData';

    const result =
      handleAction_(
        action,
        params,
        e
      );

    return corsJsonResponse_(result);

  } catch (error) {

    return corsJsonResponse_({
      success: false,
      error: errorMessage_(error)
    });

  }

}


/* ============================================================
   POST API
   ============================================================
   
   Supports:
   1. application/json
   2. application/x-www-form-urlencoded
   3. text/plain
   
   ============================================================ */

function doPost(e) {

  try {

    let body = {};

    /*
     * ----------------------------------------------------------
     * 1. JSON request
     * ----------------------------------------------------------
     */

    if (
      e &&
      e.postData &&
      e.postData.contents
    ) {

      const raw =
        String(
          e.postData.contents
        ).trim();

      if (raw) {

        try {

          body =
            JSON.parse(raw);

        } catch (jsonError) {

          /*
           * যদি JSON না হয়,
           * তাহলে key=value format parse করার চেষ্টা
           */

          body =
            parseFormBody_(
              raw
            );

        }

      }

    }


    /*
     * ----------------------------------------------------------
     * 2. Form parameters
     * ----------------------------------------------------------
     *
     * Google Apps Script-এর e.parameter
     * অনেক ক্ষেত্রে JSON body-এর বাইরে data দেয়।
     */

    if (
      e &&
      e.parameter
    ) {

      Object.keys(
        e.parameter
      ).forEach(
        function(key) {

          if (
            body[key] ===
            undefined
          ) {

            body[key] =
              e.parameter[key];

          }

        }
      );

    }


    /*
     * ----------------------------------------------------------
     * Payload যদি string হিসেবে আসে
     * ----------------------------------------------------------
     */

    if (
      typeof body.payload ===
      'string'
    ) {

      try {

        body.payload =
          JSON.parse(
            body.payload
          );

      } catch (error) {

        // Ignore
      }

    }


    const action =
      body.action ||
      'getAllData';


    const result =
      handleAction_(
        action,
        body,
        e
      );


    return corsJsonResponse_(
      result
    );

  } catch (error) {

    return corsJsonResponse_({

      success: false,

      error:
        errorMessage_(
          error
        )

    });

  }

}


/* ============================================================
   ACTION HANDLER
   ============================================================ */

function handleAction_(
  action,
  body,
  e
) {

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );


  switch (
    String(action)
  ) {


    /* ========================================================
       GET ALL DATA
       ======================================================== */

    case 'getAllData':

      return getAllData_(
        ss
      );


    /* ========================================================
       LOGIN
       ======================================================== */

    case 'login':

      return adminLogin_(
        body.password ||
        ''
      );


    /* ========================================================
       SAVE ALL DATA
       ======================================================== */

    case 'saveAllData':

      requireAdmin_(
        body.token
      );

      return saveAllData_(
        ss,
        body.payload ||
        {}
      );


    /* ========================================================
       DELETE BORDER
       ======================================================== */

    case 'deleteBorder':

      requireAdmin_(
        body.token
      );

      return deleteById_(
        ss.getSheetByName(
          SHEETS.MONEY
        ),
        body.id
      );


    /* ========================================================
       DELETE RICE
       ======================================================== */

    case 'deleteRice':

      requireAdmin_(
        body.token
      );

      return deleteById_(
        ss.getSheetByName(
          SHEETS.RICE
        ),
        body.id
      );


    /* ========================================================
       CHANGE ADMIN PASSWORD
       ======================================================== */

    case 'changeAdminPassword':

      /*
       * Password change is disabled
       * Fixed password: 180665
       */

      requireAdmin_(
        body.token
      );

      return {
        success: false,
        error: 'Admin password পরিবর্তন করা যায় না। Password fixed: 180665'
      };


    /* ========================================================
       SETUP SHEETS
       ======================================================== */

    case 'setupSheets':

      requireAdmin_(
        body.token
      );

      return setupSheets();


    /* ========================================================
       PUBLIC SETUP CHECK
       ======================================================== */

    case 'ping':

      return {
        success: true,
        message: 'API is working',
        timestamp: new Date().toISOString()
      };


    default:

      throw new Error(
        'Unknown API action: ' +
        action
      );

  }

}


/* ============================================================
   SETUP SHEETS
   ============================================================ */

function setupSheets() {

  const ss =
    SpreadsheetApp.openById(
      SPREADSHEET_ID
    );


  const configSheet =
    ensureSheet_(
      ss,
      SHEETS.CONFIG,
      CONFIG_HEADERS
    );


  const moneySheet =
    ensureSheet_(
      ss,
      SHEETS.MONEY,
      MONEY_HEADERS
    );


  const riceSheet =
    ensureSheet_(
      ss,
      SHEETS.RICE,
      RICE_HEADERS
    );


  const defaults = {};


  defaults[
    CONFIG_KEYS.HOSTEL_NAME
  ] =
    'আদর্শ আল মাস ছাত্রাবাস';


  defaults[
    CONFIG_KEYS.ADDRESS
  ] =
    '';


  defaults[
    CONFIG_KEYS.DEVELOPER
  ] =
    'মোঃ আরিফুল ইসলাম';


  defaults[
    CONFIG_KEYS.DEVELOPER_FB
  ] =
    'https://www.facebook.com/mdarifulislam15';


  defaults[
    CONFIG_KEYS.LOGO
  ] =
    'https://lh3.googleusercontent.com/d/1zO9JQySD2r05aBM7kpI2gVlMGl6zt-QC';


  /*
   * Apps Script Web App URL
   */

  defaults[
    CONFIG_KEYS.APP_SCRIPT_URL
  ] =
    ScriptApp.getService().getUrl() ||
    '';


  defaults[
    CONFIG_KEYS.SLIDER_IMAGES
  ] =
    '[]';


  defaults[
    CONFIG_KEYS.MONTH
  ] =
    '';


  defaults[
    CONFIG_KEYS.YEAR
  ] =
    '';


  defaults[
    CONFIG_KEYS.MEAL_RATE
  ] =
    '0';


  const existing =
    readConfig_(
      configSheet
    );


  Object.keys(
    defaults
  ).forEach(
    function(key) {

      if (
        existing[key] ===
          undefined ||
        existing[key] === ''
      ) {

        setConfigValue_(
          configSheet,
          key,
          defaults[key]
        );

      }

    }
  );


  styleSheet_(
    configSheet
  );

  styleSheet_(
    moneySheet
  );

  styleSheet_(
    riceSheet
  );


  SpreadsheetApp.flush();


  return {

    success: true,

    message:
      'Google Sheets সফলভাবে Setup হয়েছে।',

    sheets: [
      SHEETS.CONFIG,
      SHEETS.MONEY,
      SHEETS.RICE
    ]

  };

}


/* ============================================================
   ADMIN LOGIN
   ============================================================
   
   Fixed password: 180665
   Cannot be changed
   
   ============================================================ */

function adminLogin_(
  password
) {

  const inputHash =
    sha256_(
      String(
        password
      )
    );


  /*
   * Compare with fixed password hash
   */

  if (
    inputHash !==
    FIXED_ADMIN_PASSWORD_HASH
  ) {

    return {

      success: false,

      error:
        'ভুল Admin Password। Password: 180665'

    };

  }


  /*
   * Secure random session token
   */

  const token =
    Utilities
      .base64EncodeWebSafe(
        JSON.stringify({

          timestamp:
            Date.now(),

          nonce:
            Utilities.getUuid(),

          random:
            Utilities.getUuid()

        })
      );


  /*
   * 6 ঘণ্টার session
   */

  CacheService
    .getScriptCache()
    .put(
      'ADMIN_' +
      token,
      'VALID',
      21600
    );


  return {

    success: true,

    token:
      token,

    expiresIn:
      21600

  };

}


/* ============================================================
   ADMIN AUTHENTICATION
   ============================================================ */

function requireAdmin_(
  token
) {

  if (
    !token
  ) {

    throw new Error(
      'Admin authentication required.'
    );

  }


  const value =
    CacheService
      .getScriptCache()
      .get(
        'ADMIN_' +
        String(token)
      );


  if (
    value !==
    'VALID'
  ) {

    throw new Error(
      'Admin session expired অথবা invalid.'
    );

  }

}


/* ============================================================
   GET ALL DATA
   ============================================================ */

function getAllData_(
  ss
) {

  const configSheet =
    ensureSheet_(
      ss,
      SHEETS.CONFIG,
      CONFIG_HEADERS
    );


  const moneySheet =
    ensureSheet_(
      ss,
      SHEETS.MONEY,
      MONEY_HEADERS
    );


  const riceSheet =
    ensureSheet_(
      ss,
      SHEETS.RICE,
      RICE_HEADERS
    );


  const config =
    readConfig_(
      configSheet
    );


  const moneyRows =
    readRows_(
      moneySheet
    );


  const riceRows =
    readRows_(
      riceSheet
    );


  /* ==========================================================
     MONEY
     ========================================================== */

  const borders =
    moneyRows
      .map(
        function(
          row,
          index
        ) {

          const id =
            row[0]
              ? String(
                  row[0]
                )
              : 'border-' +
                (
                  index +
                  1
                );


          const name =
            String(
              row[1] ||
              ''
            );


          const mealCount =
            num_(
              row[2]
            );


          const mealRate =
            num_(
              row[3]
            );


          /*
           * মিল খরচ =
           * মিল সংখ্যা × মিল রেট
           */

          const mealCost =
            round_(
              mealCount *
              mealRate
            );


          const extra =
            num_(
              row[5]
            );


          const misc =
            num_(
              row[6]
            );


          /*
           * মোট খরচ =
           * মিল খরচ + অতিরিক্ত + বিবিধ
           */

          const totalCost =
            round_(
              mealCost +
              extra +
              misc
            );


          const totalDeposit =
            num_(
              row[8]
            );


          let managerReceives =
            0;


          let borderReceives =
            0;


          /*
           * খরচ > জমা
           * Manager পাবে
           */

          if (
            totalCost >
            totalDeposit
          ) {

            managerReceives =
              round_(
                totalCost -
                totalDeposit
              );

          }


          /*
           * জমা >= খরচ
           * Border পাবে
           */

          else {

            borderReceives =
              round_(
                totalDeposit -
                totalCost
              );

          }


          return {

            id:
              id,

            name:
              name,

            mealCount:
              mealCount,

            mealRate:
              mealRate,

            mealCost:
              mealCost,

            extraCost:
              extra,

            miscCost:
              misc,

            totalCost:
              totalCost,

            totalDeposit:
              totalDeposit,

            managerReceives:
              managerReceives,

            borderReceives:
              borderReceives

          };

        }
      )
      .filter(
        function(item) {

          return (
            item.name !== ''
          );

        }
      );


  /* ==========================================================
     RICE
     ========================================================== */

  const rice =
    riceRows
      .map(
        function(
          row,
          index
        ) {

          const id =
            row[0]
              ? String(
                  row[0]
                )
              : 'rice-' +
                (
                  index +
                  1
                );


          const borderName =
            String(
              row[1] ||
              ''
            );


          /*
           * চালের একক = পট
           */

          const mealCost =
            num_(
              row[2]
            );


          const extra =
            num_(
              row[3]
            );


          /*
           * মোট খরচ =
           * মিল খরচ + অতিরিক্ত
           */

          const totalCost =
            round_(
              mealCost +
              extra
            );


          const totalDeposit =
            num_(
              row[5]
            );


          let managerReceives =
            0;


          let borderReceives =
            0;


          if (
            totalCost >
            totalDeposit
          ) {

            managerReceives =
              round_(
                totalCost -
                totalDeposit
              );

          }

          else {

            borderReceives =
              round_(
                totalDeposit -
                totalCost
              );

          }


          return {

            id:
              id,

            borderName:
              borderName,

            consumedPot:
              mealCost,

            extraPot:
              extra,

            totalCostPot:
              totalCost,

            depositPot:
              totalDeposit,

            managerReceivesPot:
              managerReceives,

            borderReceivesPot:
              borderReceives

          };

        }
      )
      .filter(
        function(item) {

          return (
            item.borderName !== ''
          );

        }
      );


  /* ==========================================================
     SLIDER IMAGES
     ========================================================== */

  let sliderImages =
    [];


  try {

    sliderImages =
      JSON.parse(
        config[
          CONFIG_KEYS.SLIDER_IMAGES
        ] ||
        '[]'
      );

  } catch (error) {

    sliderImages =
      [];

  }


  if (
    !Array.isArray(
      sliderImages
    )
  ) {

    sliderImages =
      [];

  }


  sliderImages =
    sliderImages
      .map(
        function(item) {

          return {

            id:
              item.id ||
              Utilities.getUuid(),

            title:
              item.title ||
              '',

            url:
              normalizeImageUrl_(
                item.url ||
                ''
              )

          };

        }
      )
      .filter(
        function(item) {

          return (
            item.url !== ''
          );

        }
      );


  return {

    success: true,

    data: {

      config:
        config,

      borders:
        borders,

      rice:
        rice,

      sliderImages:
        sliderImages

    }

  };

}


/* ============================================================
   SAVE ALL DATA
   ============================================================ */

function saveAllData_(
  ss,
  payload
) {

  const configSheet =
    ensureSheet_(
      ss,
      SHEETS.CONFIG,
      CONFIG_HEADERS
    );


  const moneySheet =
    ensureSheet_(
      ss,
      SHEETS.MONEY,
      MONEY_HEADERS
    );


  const riceSheet =
    ensureSheet_(
      ss,
      SHEETS.RICE,
      RICE_HEADERS
    );


  /* ==========================================================
     CONFIG
     ========================================================== */

  if (
    payload &&
    payload.config
  ) {

    const config =
      Object.assign(
        {},
        payload.config
      );


    /*
     * Password কখনো frontend
     * থেকে overwrite করা যাবে না।
     */

    delete config.adminPassword;

    delete config.adminPasswordHash;


    Object.keys(
      config
    ).forEach(
      function(key) {

        let value =
          config[key];


        if (
          key ===
          CONFIG_KEYS.LOGO
        ) {

          value =
            normalizeImageUrl_(
              value
            );

        }


        if (
          key ===
          CONFIG_KEYS.SLIDER_IMAGES
        ) {

          if (
            Array.isArray(
              value
            )
          ) {

            value =
              JSON.stringify(
                value
              );

          }

        }


        setConfigValue_(
          configSheet,
          key,
          value
        );

      }
    );

  }


  /* ==========================================================
     SLIDER
     ========================================================== */

  if (
    payload &&
    Array.isArray(
      payload.sliderImages
    )
  ) {

    const images =
      payload.sliderImages.map(
        function(item) {

          return {

            id:
              item.id ||
              Utilities.getUuid(),

            title:
              item.title ||
              '',

            url:
              normalizeImageUrl_(
                item.url ||
                ''
              )

          };

        }
      );


    setConfigValue_(
      configSheet,

      CONFIG_KEYS.SLIDER_IMAGES,

      JSON.stringify(
        images
      )

    );

  }


  /* ==========================================================
     MONEY
     ========================================================== */

  if (
    payload &&
    Array.isArray(
      payload.borders
    )
  ) {

    const rows =
      payload.borders.map(
        function(
          border,
          index
        ) {

          const id =
            border.id ||
            'border-' +
            (
              index +
              1
            );


          const name =
            border.name ||
            '';


          const mealCount =
            num_(
              border.mealCount
            );


          const mealRate =
            num_(
              border.mealRate
            );


          /*
           * মিল খরচ
           */

          const mealCost =
            round_(
              mealCount *
              mealRate
            );


          const extra =
            num_(
              border.extraCost
            );


          const misc =
            num_(
              border.miscCost
            );


          /*
           * মোট খরচ
           */

          const totalCost =
            round_(
              mealCost +
              extra +
              misc
            );


          const totalDeposit =
            num_(
              border.totalDeposit
            );


          let managerReceives =
            0;


          let borderReceives =
            0;


          if (
            totalCost >
            totalDeposit
          ) {

            managerReceives =
              round_(
                totalCost -
                totalDeposit
              );

          }

          else {

            borderReceives =
              round_(
                totalDeposit -
                totalCost
              );

          }


          return [

            id,

            name,

            mealCount,

            mealRate,

            mealCost,

            extra,

            misc,

            totalCost,

            totalDeposit,

            managerReceives,

            borderReceives

          ];

        }
      );


    replaceData_(
      moneySheet,
      rows
    );

  }


  /* ==========================================================
     RICE
     ========================================================== */

  if (
    payload &&
    Array.isArray(
      payload.rice
    )
  ) {

    const rows =
      payload.rice.map(
        function(
          item,
          index
        ) {

          const id =
            item.id ||
            'rice-' +
            (
              index +
              1
            );


          const borderName =
            item.borderName ||
            '';


          const mealCost =
            num_(
              item.consumedPot
            );


          const extra =
            num_(
              item.extraPot
            );


          /*
           * মোট খরচ
           */

          const totalCost =
            round_(
              mealCost +
              extra
            );


          const deposit =
            num_(
              item.depositPot
            );


          let managerReceives =
            0;


          let borderReceives =
            0;


          if (
            totalCost >
            deposit
          ) {

            managerReceives =
              round_(
                totalCost -
                deposit
              );

          }

          else {

            borderReceives =
              round_(
                deposit -
                totalCost
              );

          }


          return [

            id,

            borderName,

            mealCost,

            extra,

            totalCost,

            deposit,

            managerReceives,

            borderReceives

          ];

        }
      );


    replaceData_(
      riceSheet,
      rows
    );

  }


  SpreadsheetApp.flush();


  return {

    success: true,

    message:
      'সব তথ্য এক API call-এ Google Sheets-এ আপডেট হয়েছে।'

  };

}


/* ============================================================
   DELETE BY ID
   ============================================================ */

function deleteById_(
  sheet,
  id
) {

  if (
    !sheet
  ) {

    throw new Error(
      'Sheet পাওয়া যায়নি।'
    );

  }


  if (
    !id
  ) {

    throw new Error(
      'Record ID দেওয়া হয়নি।'
    );

  }


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow <
    2
  ) {

    throw new Error(
      'কোনো data পাওয়া যায়নি।'
    );

  }


  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        1
      )
      .getValues();


  for (
    let i = 0;
    i < values.length;
    i++
  ) {

    if (
      String(
        values[i][0]
      ) ===
      String(id)
    ) {

      sheet.deleteRow(
        i + 2
      );


      return {

        success: true,

        message:
          'তথ্য সফলভাবে Delete হয়েছে।'

      };

    }

  }


  throw new Error(
    'Record পাওয়া যায়নি।'
  );

}


/* ============================================================
   ENSURE SHEET
   ============================================================ */

function ensureSheet_(
  ss,
  name,
  headers
) {

  let sheet =
    ss.getSheetByName(
      name
    );


  if (
    !sheet
  ) {

    sheet =
      ss.insertSheet(
        name
      );

  }


  sheet
    .getRange(
      1,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ]);


  return sheet;

}


/* ============================================================
   STYLE SHEET
   ============================================================ */

function styleSheet_(
  sheet
) {

  sheet.setFrozenRows(
    1
  );


  const lastColumn =
    sheet.getLastColumn();


  if (
    lastColumn <
    1
  ) {

    return;

  }


  sheet
    .getRange(
      1,
      1,
      1,
      lastColumn
    )
    .setFontWeight(
      'bold'
    )
    .setBackground(
      '#17324D'
    )
    .setFontColor(
      '#FFFFFF'
    );


  sheet.autoResizeColumns(
    1,
    lastColumn
  );

}


/* ============================================================
   READ ROWS
   ============================================================ */

function readRows_(
  sheet
) {

  const lastRow =
    sheet.getLastRow();


  const lastColumn =
    sheet.getLastColumn();


  if (
    lastRow <
      2 ||
    lastColumn <
      1
  ) {

    return [];

  }


  return sheet
    .getRange(
      2,
      1,
      lastRow - 1,
      lastColumn
    )
    .getValues();

}


/* ============================================================
   REPLACE DATA
   ============================================================ */

function replaceData_(
  sheet,
  rows
) {

  const lastRow =
    sheet.getLastRow();


  const lastColumn =
    sheet.getLastColumn();


  /*
   * পুরোনো data পরিষ্কার
   */

  if (
    lastRow >
    1
  ) {

    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        lastColumn
      )
      .clearContent();

  }


  /*
   * নতুন data
   */

  if (
    rows &&
    rows.length
  ) {

    sheet
      .getRange(
        2,
        1,
        rows.length,
        rows[0].length
      )
      .setValues(
        rows
      );

  }

}


/* ============================================================
   READ CONFIG
   ============================================================ */

function readConfig_(
  sheet
) {

  const result =
    {};


  const lastRow =
    sheet.getLastRow();


  if (
    lastRow <
    2
  ) {

    return result;

  }


  const rows =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        2
      )
      .getValues();


  rows.forEach(
    function(row) {

      if (
        row[0] !==
        ''
      ) {

        result[
          String(
            row[0]
          )
        ] =
          row[1];

      }

    }
  );


  return result;

}


/* ============================================================
   SET CONFIG VALUE
   ============================================================ */

function setConfigValue_(
  sheet,
  key,
  value
) {

  const lastRow =
    sheet.getLastRow();


  if (
    lastRow >=
    2
  ) {

    const rows =
      sheet
        .getRange(
          2,
          1,
          lastRow - 1,
          2
        )
        .getValues();


    for (
      let i = 0;
      i < rows.length;
      i++
    ) {

      if (
        String(
          rows[i][0]
        ) ===
        String(key)
      ) {

        sheet
          .getRange(
            i + 2,
            2
          )
          .setValue(
            value
          );


        return;

      }

    }

  }


  sheet.appendRow([
    key,
    value
  ]);

}


/* ============================================================
   GOOGLE DRIVE IMAGE URL CONVERTER
   ============================================================ */

function normalizeImageUrl_(
  url
) {

  const value =
    String(
      url ||
      ''
    ).trim();


  if (
    !value
  ) {

    return '';

  }


  /*
   * Already converted
   */

  if (
    value.indexOf(
      'https://lh3.googleusercontent.com/d/'
    ) ===
    0
  ) {

    return value;

  }


  /*
   * Google Drive:
   *
   * https://drive.google.com/file/d/FILE_ID/view
   *
   * =>
   *
   * https://lh3.googleusercontent.com/d/FILE_ID
   */

  const match =
    value.match(
      /\/file\/d\/([a-zA-Z0-9_-]+)/
    )
    ||
    value.match(
      /[?&]id=([a-zA-Z0-9_-]+)/
    )
    ||
    value.match(
      /\/d\/([a-zA-Z0-9_-]+)/
    );


  if (
    match
  ) {

    return (
      'https://lh3.googleusercontent.com/d/' +
      match[1]
    );

  }


  return value;

}


/* ============================================================
   NUMBER CONVERTER
   ============================================================ */

function num_(
  value
) {

  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ''
  ) {

    return 0;

  }


  let text =
    String(
      value
    );


  /*
   * বাংলা সংখ্যা → English সংখ্যা
   */

  text =
    text
      .replace(
        /০/g,
        '0'
      )
      .replace(
        /১/g,
        '1'
      )
      .replace(
        /२/g,
        '2'
      )
      .replace(
        /३/g,
        '3'
      )
      .replace(
        /४/g,
        '4'
      )
      .replace(
        /५/g,
        '5'
      )
      .replace(
        /६/g,
        '6'
      )
      .replace(
        /७/g,
        '7'
      )
      .replace(
        /८/g,
        '8'
      )
      .replace(
        /९/g,
        '9'
      );


  const number =
    Number(
      text
    );


  if (
    !isFinite(
      number
    )
  ) {

    return 0;

  }


  return Math.max(
    0,
    number
  );

}


/* ============================================================
   ROUND
   ============================================================ */

function round_(
  number
) {

  return Math.round(
    (
      Number(
        number
      ) ||
      0
    ) *
    100
  ) / 100;

}


/* ============================================================
   SHA-256
   ============================================================ */

function sha256_(
  text
) {

  const bytes =
    Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(
        text
      ),
      Utilities.Charset.UTF_8
    );


  return bytes
    .map(
      function(byte) {

        return (
          '0' +
          (
            byte &
            0xFF
          ).toString(16)
        ).slice(-2);

      }
    )
    .join('');

}


/* ============================================================
   FORM BODY PARSER
   ============================================================ */

function parseFormBody_(
  raw
) {

  const result =
    {};


  if (
    !raw
  ) {

    return result;

  }


  raw
    .split('&')
    .forEach(
      function(pair) {

        const parts =
          pair.split('=');


        const key =
          decodeURIComponent(
            parts[0] ||
            ''
          );


        const value =
          decodeURIComponent(
            (
              parts
                .slice(1)
                .join('=') ||
              ''
            )
              .replace(
                /\+/g,
                ' '
              )
          );


        if (
          key
        ) {

          result[key] =
            value;

        }

      }
    );


  return result;

}


/* ============================================================
   ERROR MESSAGE
   ============================================================ */

function errorMessage_(
  error
) {

  if (
    error &&
    error.message
  ) {

    return String(
      error.message
    );

  }


  return String(
    error ||
    'Unknown error'
  );

}


/* ============================================================
   JSON RESPONSE WITH CORS
   ============================================================
   
   Fix for "Failed to fetch" error on Netlify
   
   ============================================================ */

function corsJsonResponse_(
  data
) {

  const output =
    ContentService
      .createTextOutput(
        JSON.stringify(
          data
        )
      );

  output.setMimeType(
    ContentService.MimeType.JSON
  );

  output.addHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  output.addHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, OPTIONS'
  );

  output.addHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  output.addHeader(
    'Cache-Control',
    'no-cache, no-store, must-revalidate'
  );

  return output;

}
