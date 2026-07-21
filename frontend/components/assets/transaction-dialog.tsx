'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/* ─── CurrencyInput ────────────────────────────────────────────────────────── */

interface CurrencyInputProps {
  id?: string;
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  disabled?: boolean;
  currency?: string;
}

function CurrencyInput({ id, value, onChange, placeholder, disabled, currency = 'BRL' }: CurrencyInputProps) {
  const [display, setDisplay] = React.useState(() =>
    value != null && value > 0
      ? (value * 100).toFixed(0)
      : '',
  );

  React.useEffect(() => {
    if (value == null || value === 0) {
      setDisplay('');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    setDisplay(digits);
    const numeric = digits === '' ? 0 : parseInt(digits, 10) / 100;
    onChange(numeric);
  };

  const symbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? 'US$' : '€';
  const defaultPlaceholder = `${symbol} 0,00`;

  const formatted = React.useMemo(() => {
    if (display === '') return '';
    const cents = parseInt(display, 10);
    if (isNaN(cents)) return '';
    return `${symbol} ${(cents / 100).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [display, symbol]);

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={formatted}
      onChange={handleChange}
      placeholder={placeholder ?? defaultPlaceholder}
      disabled={disabled}
      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    />
  );
}
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAssets, useTransactAsset, useCreateAsset } from '@/hooks/use-assets';
import { useI18n } from '@/lib/i18n/i18n-context';
import { en } from '@/lib/i18n/translations/en';
import { Loader2, PackagePlus, ArrowLeftRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── Broker / exchange lists ──────────────────────────────────────────────── */

const BROKERS_BR = [
  'XP Investimentos',
  'BTG Pactual',
  'Rico',
  'Clear',
  'Easynvest (Nubank)',
  'Inter',
  'Itaú',
  'Bradesco',
  'Santander',
  'Banco do Brasil',
  'Caixa Econômica Federal',
  'Modal',
  'Genial',
  'Órama',
  'Warren',
  'Guide',
  'Toro',
  'Avenue',
  'C6 Bank',
  'Sicoob',
];

const BROKERS_INTL = [
  'Interactive Brokers',
  'Avenue',
  'Nomad',
  'Charles Schwab',
  'Fidelity',
  'TD Ameritrade',
  'Revolut',
  'Wise',
  'Passfolio',
  'DriveWealth',
  'TradeStation',
];

const EXCHANGES_CRYPTO = [
  'Binance',
  'Coinbase',
  'Kraken',
  'Mercado Bitcoin',
  'Foxbit',
  'NovaDAX',
  'Bybit',
  'OKX',
  'Bitget',
  'Blockchain.com',
  'Ledger (self-custody)',
  'MetaMask (self-custody)',
];

const BANKS_BR = [
  'Itaú',
  'Bradesco',
  'Santander',
  'Banco do Brasil',
  'Caixa Econômica Federal',
  'Nubank',
  'BTG Pactual',
  'XP Investimentos',
  'Inter',
  'C6 Bank',
  'Daycoval',
  'Sofisa',
  'PicPay',
  'BS2',
  'BV',
  'Safra',
  'Sicoob',
  'Sicredi',
  'Agibank',
];

function brokerListForSlug(slug: string): string[] {
  if (slug === 'cryptocurrencies') return EXCHANGES_CRYPTO;
  if (slug === 'fixed-income') return BANKS_BR;
  if (
    slug === 'international-stocks' ||
    slug === 'international-etfs' ||
    slug === 'sap-stocks' ||
    slug === 'fixed-income-international'
  )
    return BROKERS_INTL;
  return BROKERS_BR;
}

interface BrokerInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  slug: string;
  value?: string;
  onChange?: (value: string) => void;
}

const BrokerInput = React.forwardRef<HTMLInputElement, BrokerInputProps>(
  ({ id, placeholder, slug, value = '', onChange, onBlur, name }, ref) => {
    const [inputValue, setInputValue] = React.useState(value as string);
    const [open, setOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const allOptions = brokerListForSlug(slug);
    const filtered = inputValue
      ? allOptions.filter((o) => o.toLowerCase().includes(inputValue.toLowerCase()))
      : allOptions;

    React.useEffect(() => {
      setInputValue(value as string);
    }, [value]);

    React.useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      onChange?.(e.target.value);
      setOpen(true);
    };

    const handleSelect = (option: string) => {
      setInputValue(option);
      onChange?.(option);
      setOpen(false);
    };

    return (
      <div ref={containerRef} className="relative">
        <input
          id={id}
          name={name}
          ref={ref}
          value={inputValue}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete="off"
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {open && filtered.length > 0 && (
          <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-popover shadow-md">
            {filtered.map((option) => (
              <li
                key={option}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(option);
                }}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                  inputValue === option && 'bg-accent text-accent-foreground font-medium',
                )}
              >
                {option}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  },
);
BrokerInput.displayName = 'BrokerInput';

/* ─── Category config ──────────────────────────────────────────────────────── */

type TickerMode = 'required' | 'optional' | 'hidden';
type CurrencyMode = 'BRL' | 'USD' | 'EUR' | 'free';

interface CategoryConfig {
  nameLabelKey: keyof typeof en;
  namePlaceholder: string;
  tickerMode: TickerMode;
  tickerLabelKey?: keyof typeof en;
  tickerPlaceholder?: string;
  currency: CurrencyMode;
  brokerLabelKey: keyof typeof en;
  brokerPlaceholder: string;
  showMaturity: boolean;
  showMaturityCheckbox: boolean;
  isFixedIncome: boolean;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  'emergency-reserve': {
    nameLabelKey: 'cc.name',
    namePlaceholder: 'ex: Reserva Nubank',
    tickerMode: 'hidden',
    currency: 'BRL',
    brokerLabelKey: 'cc.brokerBR',
    brokerPlaceholder: 'ex: Nubank',
    showMaturity: true,
    showMaturityCheckbox: true,
    isFixedIncome: false,
  },
  'cash': {
    nameLabelKey: 'cc.name',
    namePlaceholder: 'ex: Conta corrente XP',
    tickerMode: 'hidden',
    currency: 'BRL',
    brokerLabelKey: 'cc.brokerBR',
    brokerPlaceholder: 'ex: XP Investimentos',
    showMaturity: true,
    showMaturityCheckbox: true,
    isFixedIncome: false,
  },
  'fixed-income': {
    nameLabelKey: 'cc.description',
    namePlaceholder: 'ex: CDB Itaú 110% CDI',
    tickerMode: 'hidden',
    currency: 'BRL',
    brokerLabelKey: 'cc.issuer',
    brokerPlaceholder: 'ex: Itaú, BTG, Nubank',
    showMaturity: true,
    showMaturityCheckbox: false,
    isFixedIncome: true,
  },
  'fixed-income-international': {
    nameLabelKey: 'cc.securityName',
    namePlaceholder: 'ex: US Treasury 2030',
    tickerMode: 'optional',
    tickerPlaceholder: 'ex: T 4.5 2030',
    currency: 'USD',
    brokerLabelKey: 'cc.custodian',
    brokerPlaceholder: 'ex: Interactive Brokers',
    showMaturity: true,
    showMaturityCheckbox: true,
    isFixedIncome: false,
  },
  'private-pension': {
    nameLabelKey: 'cc.fundName',
    namePlaceholder: 'ex: PGBL XP Prev Renda',
    tickerMode: 'hidden',
    currency: 'BRL',
    brokerLabelKey: 'cc.insurer',
    brokerPlaceholder: 'ex: XP Vida e Previdência',
    showMaturity: true,
    showMaturityCheckbox: true,
    isFixedIncome: false,
  },
  'brazilian-stocks': {
    nameLabelKey: 'cc.companyName',
    namePlaceholder: 'ex: Itaú Unibanco',
    tickerMode: 'required',
    tickerLabelKey: 'cc.tickerRequired',
    tickerPlaceholder: 'ex: ITUB3',
    currency: 'BRL',
    brokerLabelKey: 'cc.brokerBR',
    brokerPlaceholder: 'ex: XP Investimentos',
    showMaturity: false,
    showMaturityCheckbox: false,
    isFixedIncome: false,
  },
  'international-stocks': {
    nameLabelKey: 'cc.companyName',
    namePlaceholder: 'ex: Apple Inc.',
    tickerMode: 'required',
    tickerLabelKey: 'cc.tickerRequired',
    tickerPlaceholder: 'ex: AAPL',
    currency: 'USD',
    brokerLabelKey: 'cc.brokerIntl',
    brokerPlaceholder: 'ex: Interactive Brokers',
    showMaturity: false,
    showMaturityCheckbox: false,
    isFixedIncome: false,
  },
  'sap-stocks': {
    nameLabelKey: 'cc.companyName',
    namePlaceholder: 'SAP SE',
    tickerMode: 'required',
    tickerLabelKey: 'cc.tickerRequired',
    tickerPlaceholder: 'ex: SAP',
    currency: 'EUR',
    brokerLabelKey: 'cc.brokerIntl',
    brokerPlaceholder: 'ex: Interactive Brokers',
    showMaturity: false,
    showMaturityCheckbox: false,
    isFixedIncome: false,
  },
  'cryptocurrencies': {
    nameLabelKey: 'cc.currencyName',
    namePlaceholder: 'ex: Bitcoin',
    tickerMode: 'required',
    tickerLabelKey: 'cc.symbolRequired',
    tickerPlaceholder: 'ex: BTC',
    currency: 'USD',
    brokerLabelKey: 'cc.exchange',
    brokerPlaceholder: 'ex: Binance, Coinbase',
    showMaturity: false,
    showMaturityCheckbox: false,
    isFixedIncome: false,
  },
  'real-estate': {
    nameLabelKey: 'cc.fiiName',
    namePlaceholder: 'ex: CSHG Real Estate FII',
    tickerMode: 'required',
    tickerLabelKey: 'cc.tickerRequired',
    tickerPlaceholder: 'ex: HGRE11',
    currency: 'BRL',
    brokerLabelKey: 'cc.brokerBR',
    brokerPlaceholder: 'ex: XP Investimentos',
    showMaturity: false,
    showMaturityCheckbox: false,
    isFixedIncome: false,
  },
  'international-etfs': {
    nameLabelKey: 'cc.etfName',
    namePlaceholder: 'ex: Vanguard S&P 500',
    tickerMode: 'required',
    tickerLabelKey: 'cc.tickerRequired',
    tickerPlaceholder: 'ex: VOO',
    currency: 'USD',
    brokerLabelKey: 'cc.brokerIntl',
    brokerPlaceholder: 'ex: Interactive Brokers',
    showMaturity: false,
    showMaturityCheckbox: false,
    isFixedIncome: false,
  },
  'brazilian-etfs': {
    nameLabelKey: 'cc.etfName',
    namePlaceholder: 'ex: iShares S&P 500',
    tickerMode: 'required',
    tickerLabelKey: 'cc.tickerRequired',
    tickerPlaceholder: 'ex: IVVB11',
    currency: 'BRL',
    brokerLabelKey: 'cc.brokerBR',
    brokerPlaceholder: 'ex: XP Investimentos',
    showMaturity: false,
    showMaturityCheckbox: false,
    isFixedIncome: false,
  },
};

const DEFAULT_CONFIG: CategoryConfig = {
  nameLabelKey: 'cc.name',
  namePlaceholder: 'ex: Meu ativo',
  tickerMode: 'optional',
  tickerPlaceholder: 'ex: TICK3',
  currency: 'free',
  brokerLabelKey: 'cc.brokerBR',
  brokerPlaceholder: 'ex: XP Investimentos',
  showMaturity: false,
  showMaturityCheckbox: false,
  isFixedIncome: false,
};

function getCategoryConfig(slug: string): CategoryConfig {
  return CATEGORY_CONFIG[slug] ?? DEFAULT_CONFIG;
}

/* ─── Schemas ─────────────────────────────────────────────────────────────── */

const transactionSchema = z.object({
  assetId: z.string().min(1, 'Selecione um ativo'),
  type: z.enum(['BUY', 'SELL']),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  pricePerUnit: z.coerce.number().nonnegative('Preço deve ser maior ou igual a zero'),
});

const newAssetSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').max(100),
  ticker: z.string().optional(),
  quantity: z.coerce.number().positive('Quantidade deve ser maior que zero'),
  unitPrice: z.coerce.number().positive('Preço deve ser maior que zero'),
  currency: z.enum(['BRL', 'USD', 'EUR']),
  broker: z.string().optional(),
  maturity: z.string().optional(),
  // fixed income specific
  fiType: z.enum(['CDB', 'LCI', 'LCA']).optional(),
  fiIndexer: z.enum(['CDI', 'IPCA', 'Prefixado']).optional(),
  fiRate: z.coerce.number().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;
type NewAssetFormValues = z.infer<typeof newAssetSchema>;

/* ─── Props ────────────────────────────────────────────────────────────────── */

interface TransactionDialogProps {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ─── Mode selector ────────────────────────────────────────────────────────── */

function ModeSelector({ onSelect }: { onSelect: (m: 'existing' | 'new') => void }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-2 gap-3 py-2">
      <button
        type="button"
        onClick={() => onSelect('existing')}
        className="flex flex-col items-center gap-2 rounded-xl border border-border/60 p-5 text-center hover:border-primary/50 hover:bg-muted/40 transition-colors"
      >
        <ArrowLeftRight className="h-7 w-7 text-muted-foreground" />
        <span className="font-medium text-sm">{t('td.existing')}</span>
        <span className="text-xs text-muted-foreground">{t('td.existingDesc')}</span>
      </button>
      <button
        type="button"
        onClick={() => onSelect('new')}
        className="flex flex-col items-center gap-2 rounded-xl border border-border/60 p-5 text-center hover:border-primary/50 hover:bg-muted/40 transition-colors"
      >
        <PackagePlus className="h-7 w-7 text-muted-foreground" />
        <span className="font-medium text-sm">{t('td.new')}</span>
        <span className="text-xs text-muted-foreground">{t('td.newDesc')}</span>
      </button>
    </div>
  );
}

/* ─── Existing asset (buy/sell) ────────────────────────────────────────────── */

function ExistingAssetForm({
  categoryId,
  onSuccess,
}: {
  categoryId: string;
  onSuccess: () => void;
}) {
  const { data: assets, isLoading: loadingAssets } = useAssets(categoryId);
  const { mutate: transact, isPending } = useTransactAsset();
  const { t } = useI18n();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: { type: 'BUY', assetId: '', quantity: undefined, pricePerUnit: undefined },
  });

  const assetId = watch('assetId');
  const type = watch('type');
  const quantity = watch('quantity');
  const pricePerUnit = watch('pricePerUnit');
  const selectedAsset = assets?.find((a) => a.id === assetId);

  const preview = (() => {
    if (!selectedAsset || !quantity || !pricePerUnit) return null;
    if (type === 'BUY') {
      const newQty = selectedAsset.quantity + quantity;
      const newPrice =
        (selectedAsset.quantity * selectedAsset.unitPrice + quantity * pricePerUnit) / newQty;
      return { qty: newQty, price: newPrice };
    }
    if (quantity > selectedAsset.quantity) return null;
    return { qty: selectedAsset.quantity - quantity, price: selectedAsset.unitPrice };
  })();

  const onSubmit = (data: TransactionFormValues) => {
    transact(
      { id: data.assetId, dto: { type: data.type, quantity: data.quantity, pricePerUnit: data.pricePerUnit } },
      { onSuccess },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>{t('td.asset')}</Label>
        <Select
          value={assetId}
          onValueChange={(v) => setValue('assetId', v, { shouldValidate: true })}
          disabled={loadingAssets}
        >
          <SelectTrigger>
            <SelectValue placeholder={t('td.selectAsset')} />
          </SelectTrigger>
          <SelectContent>
            {assets?.length === 0 && (
              <div className="py-3 text-center text-sm text-muted-foreground">
                {t('td.noAssetsInCat')}
              </div>
            )}
            {assets?.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.ticker ?? a.name}
                <span className="ml-2 text-xs text-muted-foreground">({a.quantity} un)</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.assetId && <p className="text-xs text-destructive">{errors.assetId.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>{t('td.type')}</Label>
        <div className="flex gap-2">
          <Button type="button" variant={type === 'BUY' ? 'default' : 'outline'} size="sm"
            className={cn('flex-1', type === 'BUY' && 'bg-emerald-600 hover:bg-emerald-700')}
            onClick={() => setValue('type', 'BUY')}>
            {t('td.buy')}
          </Button>
          <Button type="button" variant={type === 'SELL' ? 'default' : 'outline'} size="sm"
            className={cn('flex-1', type === 'SELL' && 'bg-red-600 hover:bg-red-700')}
            onClick={() => setValue('type', 'SELL')}>
            {t('td.sell')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="qty">{t('td.quantity')}</Label>
          <Input id="qty" type="number" step="any" min="0" placeholder="0" {...register('quantity')} />
          {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">{t('td.unitPrice')}</Label>
          <CurrencyInput
            id="price"
            value={pricePerUnit}
            currency={selectedAsset?.currency ?? 'BRL'}
            onChange={(v) => setValue('pricePerUnit', v, { shouldValidate: true })}
          />
          {errors.pricePerUnit && <p className="text-xs text-destructive">{errors.pricePerUnit.message}</p>}
        </div>
      </div>

      {preview && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t('td.newBalance')} </span>
          <span className="font-semibold">{preview.qty.toLocaleString(undefined, { maximumFractionDigits: 8 })} un</span>
          <span className="text-muted-foreground"> @ </span>
          <span className="font-semibold">R$ {preview.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
        </div>
      )}

      <DialogFooter className="pt-2">
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('td.confirm')}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ─── Fixed income indexer label ───────────────────────────────────────────── */

function indexerRateLabel(indexer: string | undefined) {
  if (indexer === 'CDI') return '% do CDI';
  if (indexer === 'IPCA') return 'Spread % a.a. (IPCA+)';
  if (indexer === 'Prefixado') return 'Taxa % a.a.';
  return 'Taxa';
}

function indexerRatePlaceholder(indexer: string | undefined) {
  if (indexer === 'CDI') return 'ex: 110';
  if (indexer === 'IPCA') return 'ex: 5.5';
  if (indexer === 'Prefixado') return 'ex: 12.5';
  return '0';
}

function buildFixedIncomeName(
  fiType?: string,
  broker?: string,
  fiIndexer?: string,
  fiRate?: number,
  maturity?: string,
): string {
  if (!fiType) return '';
  const parts: string[] = [fiType];
  if (broker) parts.push(broker);
  if (fiIndexer && fiRate) {
    if (fiIndexer === 'CDI') parts.push(`${fiRate}% CDI`);
    else if (fiIndexer === 'IPCA') parts.push(`IPCA+ ${fiRate}%`);
    else if (fiIndexer === 'Prefixado') parts.push(`${fiRate}% a.a.`);
  }
  if (maturity) {
    const [year] = maturity.split('-');
    if (year) parts.push(`venc. ${year}`);
  }
  return parts.join(' ');
}

/* ─── New asset form ───────────────────────────────────────────────────────── */

function NewAssetForm({
  categoryId,
  categorySlug,
  onSuccess,
}: {
  categoryId: string;
  categorySlug: string;
  onSuccess: () => void;
}) {
  const config = getCategoryConfig(categorySlug);
  const { mutate: createAsset, isPending } = useCreateAsset();
  const [noMaturity, setNoMaturity] = React.useState(false);
  const { t } = useI18n();

  const defaultCurrency = config.currency === 'free' ? 'BRL' : config.currency;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewAssetFormValues>({
    resolver: zodResolver(newAssetSchema),
    defaultValues: {
      currency: defaultCurrency,
      quantity: undefined,
      unitPrice: undefined,
      fiType: undefined,
      fiIndexer: undefined,
    },
  });

  const currency = watch('currency');
  const quantity = watch('quantity');
  const unitPrice = watch('unitPrice');
  const fiType = watch('fiType');
  const fiIndexer = watch('fiIndexer');
  const fiRate = watch('fiRate');
  const broker = watch('broker');
  const maturity = watch('maturity');

  // Auto-generate name for fixed income
  useEffect(() => {
    if (config.isFixedIncome) {
      const suggested = buildFixedIncomeName(fiType, broker, fiIndexer, fiRate, maturity);
      if (suggested) setValue('name', suggested);
    }
  }, [fiType, broker, fiIndexer, fiRate, maturity, config.isFixedIncome, setValue]);

  const subtotal = quantity && unitPrice ? quantity * unitPrice : null;
  const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? 'US$' : '€';

  const onSubmit = (data: NewAssetFormValues) => {
    createAsset(
      {
        categoryId,
        name: data.name,
        ticker: data.ticker || undefined,
        quantity: data.quantity,
        unitPrice: data.unitPrice,
        currency: data.currency,
        broker: data.broker || undefined,
      },
      { onSuccess },
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      {/* ── Fixed income type selector ── */}
      {config.isFixedIncome && (
        <div className="space-y-1.5">
          <Label>{t('td.type_label')}</Label>
          <div className="flex gap-2">
            {(['CDB', 'LCI', 'LCA'] as const).map((t) => (
              <Button
                key={t}
                type="button"
                variant={fiType === t ? 'default' : 'outline'}
                size="sm"
                className="flex-1"
                onClick={() => setValue('fiType', t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* ── Fixed income indexer ── */}
      {config.isFixedIncome && fiType && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t('td.indexer')}</Label>
            <Select
              value={fiIndexer ?? ''}
              onValueChange={(v) => setValue('fiIndexer', v as 'CDI' | 'IPCA' | 'Prefixado')}
            >
              <SelectTrigger><SelectValue placeholder={t('td.selectIndexer')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="CDI">CDI</SelectItem>
                <SelectItem value="IPCA">IPCA+</SelectItem>
                <SelectItem value="Prefixado">Prefixado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {fiIndexer && (
            <div className="space-y-1.5">
              <Label htmlFor="fiRate">{indexerRateLabel(fiIndexer)}</Label>
              <Input
                id="fiRate"
                type="number"
                step="0.01"
                min="0"
                placeholder={indexerRatePlaceholder(fiIndexer)}
                {...register('fiRate')}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Bank / broker (fixed income: shown early as it feeds name) ── */}
      {config.isFixedIncome && fiType && (
        <div className="space-y-1.5">
          <Label htmlFor="broker-fi">{t(config.brokerLabelKey)}</Label>
          <BrokerInput
            id="broker-fi"
            placeholder={config.brokerPlaceholder}
            slug={categorySlug}
            value={broker ?? ''}
            onChange={(v) => setValue('broker', v)}
          />
        </div>
      )}

      {/* ── Maturity (fixed income / pension) ── */}
      {config.isFixedIncome && fiType && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="maturity">{t('td.maturity')}</Label>
          </div>
          <Input id="maturity" type="month" disabled={noMaturity} {...register('maturity')} />
        </div>
      )}

      {/* ── Auto-generated name preview for fixed income ── */}
      {config.isFixedIncome && fiType && (
        <div className="space-y-1.5">
          <Label htmlFor="name">{t(config.nameLabelKey)} *</Label>
          <Input
            id="name"
            placeholder={config.namePlaceholder}
            {...register('name')}
          />
          <p className="text-xs text-muted-foreground">{t('td.autoGenerated')}</p>
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
      )}

      {/* ── Standard fields (non fixed-income) ── */}
      {!config.isFixedIncome && (
        <>
          <div className={cn('grid gap-3', config.tickerMode !== 'hidden' ? 'grid-cols-2' : 'grid-cols-1')}>
            <div className={cn('space-y-1.5', config.tickerMode === 'hidden' && 'col-span-1')}>
              <Label htmlFor="name">{t(config.nameLabelKey)} *</Label>
              <Input id="name" placeholder={config.namePlaceholder} {...register('name')} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {config.tickerMode !== 'hidden' && (
              <div className="space-y-1.5">
                <Label htmlFor="ticker">{t(config.tickerLabelKey ?? (config.tickerMode === 'required' ? 'cc.tickerRequired' : 'cc.ticker'))}</Label>
                <Input
                  id="ticker"
                  placeholder={config.tickerPlaceholder ?? 'ex: TICK3'}
                  {...register('ticker')}
                />
                {errors.ticker && <p className="text-xs text-destructive">{errors.ticker.message}</p>}
              </div>
            )}
          </div>

          {/* ── Currency ── */}
          {config.currency === 'free' ? (
            <div className="space-y-1.5">
              <Label>{t('td.currency')}</Label>
              <Select value={currency} onValueChange={(v) => setValue('currency', v as 'BRL' | 'USD' | 'EUR')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">{t('td.currencyBRL')}</SelectItem>
                  <SelectItem value="USD">{t('td.currencyUSD')}</SelectItem>
                  <SelectItem value="EUR">{t('td.currencyEUR')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <input type="hidden" {...register('currency')} value={config.currency} />
          )}

          {/* ── Maturity (pension / intl fixed income) ── */}
          {config.showMaturity && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="maturity">{t('td.maturity')}</Label>
                {config.showMaturityCheckbox && (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={noMaturity}
                      onChange={(e) => {
                        setNoMaturity(e.target.checked);
                        if (e.target.checked) setValue('maturity', '');
                      }}
                      className="h-3.5 w-3.5 rounded border-input accent-primary"
                    />
                    {t('td.noMaturity')}
                  </label>
                )}
              </div>
              {!noMaturity && (
                <Input id="maturity" type="month" {...register('maturity')} />
              )}
            </div>
          )}

          {/* ── Broker ── */}
          <div className="space-y-1.5">
            <Label htmlFor="broker">{t(config.brokerLabelKey)}</Label>
            <BrokerInput
              id="broker"
              placeholder={config.brokerPlaceholder}
              slug={categorySlug}
              value={broker ?? ''}
              onChange={(v) => setValue('broker', v)}
            />
          </div>
        </>
      )}

      {/* ── Quantity + price ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="newQty">{config.isFixedIncome ? t('td.invested') : t('td.quantityStar')}</Label>
          <Input id="newQty" type="number" step="any" min="0" placeholder="0" {...register('quantity')} />
          {errors.quantity && <p className="text-xs text-destructive">{errors.quantity.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPrice">{t('td.unitPriceStar')}</Label>
          <CurrencyInput
            id="newPrice"
            value={unitPrice}
            currency={currency}
            onChange={(v) => setValue('unitPrice', v, { shouldValidate: true })}
          />
          {errors.unitPrice && <p className="text-xs text-destructive">{errors.unitPrice.message}</p>}
        </div>
      </div>

      {/* ── Subtotal preview ── */}
      {subtotal !== null && subtotal > 0 && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm flex items-center justify-between">
          <span className="text-muted-foreground">{t('td.totalInvested')}</span>
          <span className="font-semibold tabular-nums">
            {currencySymbol} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* ── Currency badge (locked) ── */}
      {config.currency !== 'free' && (
        <p className="text-xs text-muted-foreground">
          Moeda: <span className="font-medium">{config.currency}</span>
        </p>
      )}

      <DialogFooter className="pt-2">
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('td.addAsset')}
        </Button>
      </DialogFooter>
    </form>
  );
}

/* ─── Main dialog ──────────────────────────────────────────────────────────── */

export function TransactionDialog({
  categoryId,
  categoryName,
  categorySlug,
  open,
  onOpenChange,
}: TransactionDialogProps) {
  const [mode, setMode] = useState<'select' | 'existing' | 'new'>('select');
  const { t } = useI18n();

  useEffect(() => {
    if (!open) setMode('select');
  }, [open]);

  const titles: Record<typeof mode, string> = {
    select: categoryName,
    existing: `${t('td.launch')} ${categoryName}`,
    new: `${t('td.newTitle')} ${categoryName}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {mode !== 'select' ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <DialogTitle className="text-base">{titles[mode]}</DialogTitle>
            </div>
          ) : (
            <DialogTitle>{titles[mode]}</DialogTitle>
          )}
        </DialogHeader>

        {mode === 'select' && <ModeSelector onSelect={setMode} />}
        {mode === 'existing' && (
          <ExistingAssetForm categoryId={categoryId} onSuccess={() => onOpenChange(false)} />
        )}
        {mode === 'new' && (
          <NewAssetForm
            categoryId={categoryId}
            categorySlug={categorySlug}
            onSuccess={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
