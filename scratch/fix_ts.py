path = '/Users/petercurrey/Desktop/Investment Centre/apps/terminal/src/app/(console)/trade/page.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix height="100%" to omit height prop (defaults to 500 or style container handles height) or container height
content = content.replace('height="100%"', 'height={600}')

# Move getTvSymbol and computeTimeHeld above TradePage function
helpers = '''function getTvSymbol(symbol: string): string {
  const inst = INSTRUMENTS.find(i => i.symbol === symbol);
  return inst ? inst.tvSymbol : 'FX:' + symbol.replace('/', '');
}

function computeTimeHeld(openedAt: string): string {
  if (!openedAt || openedAt === '—') return '—';
  const tradeTime = new Date(openedAt.includes('T') ? openedAt : openedAt.replace(' ', 'T')).getTime();
  if (isNaN(tradeTime)) return openedAt;
  const ms = Date.now() - tradeTime;
  if (ms < 0) return 'Just now';
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  return `${mins}m`;
}

'''

# Remove misplaced helpers inside component
content = content.replace(helpers, '')

# Add helpers before `function TradePageContent()`
target = "function TradePageContent()"
content = content.replace(target, helpers + target, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("TS fixes applied")
