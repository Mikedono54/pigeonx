import {
  createPurchases,
  createSandboxPurchases,
  LISTED_PRICES,
  BUSINESS_BILLING_URL,
  PRIVACY_URL,
  TERMS_URL,
} from '../src/services/purchases';
import {
  __setPurchasesSdk,
  createRevenueCatPurchases,
  packageFor,
  planFromCustomerInfo,
  pricesFrom,
  storeKey,
} from '../src/services/revenuecat';

const OFFERINGS = {
  current: {
    availablePackages: [
      {
        identifier: '$rc_monthly',
        packageType: 'MONTHLY',
        product: { priceString: '£4.49', identifier: 'pro_m' },
      },
      {
        identifier: '$rc_annual',
        packageType: 'ANNUAL',
        product: { priceString: '£26.99', identifier: 'pro_y' },
      },
    ],
  },
};

afterEach(() => {
  __setPurchasesSdk(null);
});

describe('picking a store', () => {
  const setPlan = jest.fn();

  it('uses the real store when this phone has a key', () => {
    const provider = createPurchases(setPlan, 'ios', {
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'appl_key',
    });
    expect(provider.isLive()).toBe(true);
  });

  it('uses the test one when there is no key', () => {
    expect(createPurchases(setPlan, 'ios', {}).isLive()).toBe(false);
  });

  it('looks at the key for the phone it is on', () => {
    expect(
      createPurchases(setPlan, 'android', {
        EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'appl_key',
      }).isLive()
    ).toBe(false);
    expect(
      createPurchases(setPlan, 'android', {
        EXPO_PUBLIC_REVENUECAT_ANDROID_KEY: 'goog_key',
      }).isLive()
    ).toBe(true);
  });

  it('treats an empty key as no key at all', () => {
    expect(storeKey('ios', { EXPO_PUBLIC_REVENUECAT_IOS_KEY: '   ' })).toBeNull();
    expect(storeKey('ios', {})).toBeNull();
    expect(storeKey('ios', { EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'k' })).toBe('k');
  });
});

describe('what plan the store says you have', () => {
  it('reads Pro', () => {
    expect(
      planFromCustomerInfo({ entitlements: { active: { pro: { isActive: true } } } })
    ).toBe('pro');
  });

  it('reads Business, which beats Pro', () => {
    expect(
      planFromCustomerInfo({
        entitlements: { active: { pro: {}, business: {} } },
      })
    ).toBe('business');
  });

  it('reads nothing as Free', () => {
    expect(planFromCustomerInfo({ entitlements: { active: {} } })).toBe('free');
    expect(planFromCustomerInfo(null)).toBe('free');
    expect(planFromCustomerInfo('nonsense')).toBe('free');
  });
});

describe('prices from the store', () => {
  it('finds each choice', () => {
    expect(pricesFrom(OFFERINGS)).toEqual({
      monthly: '£4.49',
      yearly: '£26.99',
    });
  });

  it('picks the right one to buy', () => {
    expect(packageFor(OFFERINGS, 'pro_yearly')?.product?.identifier).toBe('pro_y');
    expect(packageFor(OFFERINGS, 'pro_monthly')?.product?.identifier).toBe('pro_m');
  });

  it('says nothing when the store has nothing to sell', () => {
    expect(pricesFrom(null)).toEqual({ monthly: null, yearly: null });
    expect(packageFor({ current: {} }, 'pro_monthly')).toBeNull();
  });
});

describe('buying', () => {
  it('sets the plan the store hands back', async () => {
    const setPlan = jest.fn();
    __setPurchasesSdk({
      configure: jest.fn(),
      getOfferings: jest.fn(async () => OFFERINGS),
      purchasePackage: jest.fn(async () => ({
        customerInfo: { entitlements: { active: { pro: {} } } },
      })),
      restorePurchases: jest.fn(async () => ({})),
      getCustomerInfo: jest.fn(async () => ({})),
    });

    const provider = createRevenueCatPurchases(setPlan, 'appl_key');
    const result = await provider.purchase('pro_yearly');

    expect(setPlan).toHaveBeenCalledWith('pro');
    expect(result.ok).toBe(true);
  });

  it('says nothing when a person backs out', async () => {
    const setPlan = jest.fn();
    __setPurchasesSdk({
      configure: jest.fn(),
      getOfferings: jest.fn(async () => OFFERINGS),
      purchasePackage: jest.fn(async () => {
        throw { userCancelled: true };
      }),
      restorePurchases: jest.fn(async () => ({})),
      getCustomerInfo: jest.fn(async () => ({})),
    });

    const result = await createRevenueCatPurchases(setPlan, 'k').purchase(
      'pro_monthly'
    );
    expect(result.canceled).toBe(true);
    expect(result.message).toBe('');
    expect(setPlan).not.toHaveBeenCalled();
  });

  it('brings back what someone already paid for', async () => {
    const setPlan = jest.fn();
    __setPurchasesSdk({
      configure: jest.fn(),
      getOfferings: jest.fn(async () => OFFERINGS),
      purchasePackage: jest.fn(async () => ({})),
      restorePurchases: jest.fn(async () => ({
        entitlements: { active: { pro: {} } },
      })),
      getCustomerInfo: jest.fn(async () => ({})),
    });

    const result = await createRevenueCatPurchases(setPlan, 'k').restore();
    expect(setPlan).toHaveBeenCalledWith('pro');
    expect(result.ok).toBe(true);
  });

  it('says so plainly when there is nothing to bring back', async () => {
    const setPlan = jest.fn();
    __setPurchasesSdk({
      configure: jest.fn(),
      getOfferings: jest.fn(async () => OFFERINGS),
      purchasePackage: jest.fn(async () => ({})),
      restorePurchases: jest.fn(async () => ({ entitlements: { active: {} } })),
      getCustomerInfo: jest.fn(async () => ({})),
    });

    const result = await createRevenueCatPurchases(setPlan, 'k').restore();
    expect(result.message).toBe('Nothing to bring back on this account.');
  });
});

describe('the test store', () => {
  it('opens every locked path', async () => {
    const setPlan = jest.fn();
    const provider = createSandboxPurchases(setPlan);
    const result = await provider.purchase('pro_monthly');
    expect(setPlan).toHaveBeenCalledWith('pro');
    expect(result.ok).toBe(true);
    expect(await provider.prices()).toEqual({ monthly: null, yearly: null });
  });
});

describe('what the plans screen falls back to', () => {
  it('shows the listed price when the store has not answered', () => {
    expect(LISTED_PRICES.monthly).toBe('$4.99');
    expect(LISTED_PRICES.yearly).toBe('$29.99');
  });

  it('sends a business to the web to pay', () => {
    expect(BUSINESS_BILLING_URL).toBe('https://pigeonx.org/app/billing');
    expect(TERMS_URL).toBe('https://pigeonx.org/terms');
    expect(PRIVACY_URL).toBe('https://pigeonx.org/privacy');
  });
});
