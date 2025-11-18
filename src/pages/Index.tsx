import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Icon from '@/components/ui/icon';

interface DishItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  is_locked?: boolean;
  remaining_amount?: number;
}

interface DishSelection {
  dishId: number;
  amount: number;
}

const BILL_ID = 1;
const API_URL = 'https://functions.poehali.dev/7202c0b7-6e92-4f66-9534-53a9a90bfc74';

const Index = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isBillLoading, setIsBillLoading] = useState(true);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [showSplitOptions, setShowSplitOptions] = useState(false);
  const [splitMethod, setSplitMethod] = useState<'count' | 'dishes' | 'amount'>('count');
  const [guestsCount, setGuestsCount] = useState(2);
  const [selectedDishes, setSelectedDishes] = useState<DishSelection[]>([]);
  const [customAmount, setCustomAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [tipPercentage, setTipPercentage] = useState<number>(10);
  const [customTip, setCustomTip] = useState('');
  const [splitTipPercentage, setSplitTipPercentage] = useState<number>(10);
  const [splitCustomTip, setSplitCustomTip] = useState('');
  const [email, setEmail] = useState('');
  const [splitEmail, setSplitEmail] = useState('');
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [billItems, setBillItems] = useState<DishItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);

  const previousBills = [
    { id: 1, restaurant: 'Ресторан "Bella Vista"', date: '15 ноя 2025', amount: 4250, status: 'Оплачено' },
    { id: 2, restaurant: 'Кафе "Coffee Dreams"', date: '12 ноя 2025', amount: 890, status: 'Оплачено' },
    { id: 3, restaurant: 'Ресторан "Токио"', date: '8 ноя 2025', amount: 5670, status: 'Оплачено' }
  ];

  const fetchBillData = async () => {
    try {
      const response = await fetch(`${API_URL}?bill_id=${BILL_ID}`, {
        headers: {
          'X-Session-Id': sessionId
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBillItems(data.items.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          is_locked: item.is_locked,
          remaining_amount: item.remaining_amount
        })));
        setTotalAmount(data.items.reduce((sum: number, item: any) => sum + item.remaining_amount, 0));
      }
    } catch (error) {
      console.error('Failed to fetch bill:', error);
    }
  };

  useEffect(() => {
    const initBill = async () => {
      await fetchBillData();
      setIsBillLoading(false);
    };
    
    const timer = setTimeout(initBill, 2000);
    
    const interval = setInterval(fetchBillData, 3000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const lockItems = async (itemIds: number[]) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        body: JSON.stringify({
          action: 'lock_items',
          bill_id: BILL_ID,
          item_ids: itemIds
        })
      });
    } catch (error) {
      console.error('Failed to lock items:', error);
    }
  };

  const unlockItems = async (itemIds: number[]) => {
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        body: JSON.stringify({
          action: 'unlock_items',
          item_ids: itemIds
        })
      });
    } catch (error) {
      console.error('Failed to unlock items:', error);
    }
  };

  const handleDishToggle = async (dishId: number, checked: boolean) => {
    const dish = billItems.find(d => d.id === dishId);
    if (!dish) return;

    if (checked) {
      await lockItems([dishId]);
      setSelectedDishes([...selectedDishes, { dishId, amount: dish.remaining_amount || 0 }]);
    } else {
      await unlockItems([dishId]);
      setSelectedDishes(selectedDishes.filter(d => d.dishId !== dishId));
    }
  };

  const handleDishAmountChange = (dishId: number, amount: number) => {
    setSelectedDishes(
      selectedDishes.map(d => d.dishId === dishId ? { ...d, amount } : d)
    );
  };

  const calculateTipAmount = () => {
    if (customTip) {
      return Number(customTip) || 0;
    }
    return Math.round(totalAmount * (tipPercentage / 100));
  };

  const calculateSplitTipAmount = () => {
    const baseAmount = calculateSplitBaseAmount();
    if (splitCustomTip) {
      return Number(splitCustomTip) || 0;
    }
    return Math.round(baseAmount * (splitTipPercentage / 100));
  };

  const calculateSplitBaseAmount = () => {
    if (splitMethod === 'count') {
      return Math.round(totalAmount / guestsCount);
    } else if (splitMethod === 'dishes') {
      return selectedDishes.reduce((sum, d) => sum + d.amount, 0);
    } else {
      return Number(customAmount) || 0;
    }
  };

  const calculatePaymentAmount = () => {
    if (showSplitOptions) {
      return calculateSplitBaseAmount() + calculateSplitTipAmount();
    }
    return totalAmount + calculateTipAmount();
  };

  const handlePayment = () => {
    const amount = calculatePaymentAmount();
    if (amount > 0) {
      setShowPayment(true);
    }
  };

  if (showPayment) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setShowPayment(false)}>
            <Icon name="ArrowLeft" size={24} />
          </Button>
          <h1 className="text-lg font-bold">Оплата</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-orange-600 rounded-full flex items-center justify-center animate-pulse">
            <Icon name="CreditCard" size={40} className="text-white" />
          </div>
          
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">{calculatePaymentAmount().toLocaleString('ru-RU')} ₽</h2>
            <p className="text-muted-foreground">К оплате</p>
          </div>

          <Card className="w-full max-w-md p-6 space-y-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Номер карты</label>
              <Input placeholder="0000 0000 0000 0000" className="text-lg" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-sm font-medium">Срок</label>
                <Input placeholder="ММ/ГГ" />
              </div>
              <div className="space-y-3">
                <label className="text-sm font-medium">CVV</label>
                <Input placeholder="000" type="password" maxLength={3} />
              </div>
            </div>

            <Separator className="my-4" />

            <Button className="w-full h-12 text-lg font-semibold" size="lg">
              Оплатить {calculatePaymentAmount().toLocaleString('ru-RU')} ₽
            </Button>
          </Card>

          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Icon name="Lock" size={16} />
            <span>Защищённая оплата через ZenZero</span>
          </div>
        </div>
      </div>
    );
  }

  if (showSplitOptions) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => {
            setShowSplitOptions(false);
            unlockItems(selectedDishes.map(d => d.dishId));
            setSelectedDishes([]);
          }}>
            <Icon name="ArrowLeft" size={24} />
          </Button>
          <h1 className="text-lg font-bold">Разделить счёт</h1>
          <div className="w-10" />
        </div>

        <Tabs value={splitMethod} onValueChange={(v) => setSplitMethod(v as any)} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="count">По гостям</TabsTrigger>
            <TabsTrigger value="dishes">По блюдам</TabsTrigger>
            <TabsTrigger value="amount">По сумме</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="count" className="p-4 space-y-6">
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Детали счёта</h3>
                {billItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">{(item.remaining_amount || 0).toLocaleString('ru-RU')} ₽</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Осталось оплатить</span>
                  <span>{totalAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-medium">Количество гостей</span>
                  <div className="flex items-center space-x-3">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setGuestsCount(Math.max(2, guestsCount - 1))}
                    >
                      <Icon name="Minus" size={18} />
                    </Button>
                    <span className="text-2xl font-bold w-12 text-center">{guestsCount}</span>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setGuestsCount(guestsCount + 1)}
                    >
                      <Icon name="Plus" size={18} />
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">На каждого</span>
                    <span className="font-medium">{Math.round(totalAmount / guestsCount).toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Чаевые</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[10, 15, 20].map((percent) => (
                    <Button
                      key={percent}
                      variant={splitTipPercentage === percent && !splitCustomTip ? "default" : "outline"}
                      onClick={() => {
                        setSplitTipPercentage(percent);
                        setSplitCustomTip('');
                      }}
                      className="h-12"
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Своя сумма</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      value={splitCustomTip}
                      onChange={(e) => setSplitCustomTip(e.target.value)}
                      placeholder="0"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
                  </div>
                </div>

                <div className="flex justify-between text-sm pt-2">
                  <span className="text-muted-foreground">Сумма чаевых</span>
                  <span className="font-medium">{calculateSplitTipAmount().toLocaleString('ru-RU')} ₽</span>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <Label className="text-sm font-medium">Отправить чек на почту</Label>
                <Input 
                  type="email"
                  value={splitEmail}
                  onChange={(e) => setSplitEmail(e.target.value)}
                  placeholder="example@mail.ru"
                />
              </Card>

              <Card className="p-4 bg-secondary/30">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Итого к оплате</span>
                  <span className="text-xl font-bold text-primary">
                    {calculatePaymentAmount().toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="dishes" className="p-4 space-y-4">
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Детали счёта</h3>
                {billItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">{(item.remaining_amount || 0).toLocaleString('ru-RU')} ₽</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Осталось оплатить</span>
                  <span>{totalAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
              </Card>

              <p className="text-sm text-muted-foreground px-2">Выберите блюда, которые вы оплачиваете</p>
              
              {billItems.map((dish) => {
                const selection = selectedDishes.find(d => d.dishId === dish.id);
                const isChecked = !!selection;
                const dishRemaining = dish.remaining_amount || 0;

                if (dish.is_locked) {
                  return (
                    <Card key={dish.id} className="p-4 bg-gray-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                          <Icon name="Clock" size={20} className="text-yellow-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-700">{dish.name}</p>
                          <p className="text-sm text-yellow-600">Другой клиент в процессе оплаты</p>
                        </div>
                      </div>
                    </Card>
                  );
                }

                if (dishRemaining === 0) {
                  return (
                    <Card key={dish.id} className="p-4 bg-green-50">
                      <div className="flex items-center space-x-3">
                        <Icon name="CheckCircle2" size={20} className="text-green-600" />
                        <div className="flex-1">
                          <p className="font-medium text-gray-700">{dish.name}</p>
                          <p className="text-sm text-green-600">Оплачено</p>
                        </div>
                      </div>
                    </Card>
                  );
                }

                return (
                  <Card key={dish.id} className="p-4 space-y-3">
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        checked={isChecked}
                        onCheckedChange={(checked) => handleDishToggle(dish.id, checked as boolean)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{dish.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {dish.price.toLocaleString('ru-RU')} ₽ × {dish.quantity}
                            </p>
                          </div>
                          <p className="font-bold">{dishRemaining.toLocaleString('ru-RU')} ₽</p>
                        </div>

                        {isChecked && (
                          <div className="mt-3 space-y-2">
                            <label className="text-xs text-muted-foreground">Оплачиваю</label>
                            <div className="flex items-center space-x-2">
                              <Input 
                                type="number"
                                value={selection.amount}
                                onChange={(e) => handleDishAmountChange(dish.id, Number(e.target.value))}
                                max={dishRemaining}
                                className="h-9"
                              />
                              <span className="text-sm whitespace-nowrap">из {dishRemaining} ₽</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}

              <Card className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Чаевые</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[10, 15, 20].map((percent) => (
                    <Button
                      key={percent}
                      variant={splitTipPercentage === percent && !splitCustomTip ? "default" : "outline"}
                      onClick={() => {
                        setSplitTipPercentage(percent);
                        setSplitCustomTip('');
                      }}
                      className="h-12"
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Своя сумма</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      value={splitCustomTip}
                      onChange={(e) => setSplitCustomTip(e.target.value)}
                      placeholder="0"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
                  </div>
                </div>

                <div className="flex justify-between text-sm pt-2">
                  <span className="text-muted-foreground">Сумма чаевых</span>
                  <span className="font-medium">{calculateSplitTipAmount().toLocaleString('ru-RU')} ₽</span>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <Label className="text-sm font-medium">Отправить чек на почту</Label>
                <Input 
                  type="email"
                  value={splitEmail}
                  onChange={(e) => setSplitEmail(e.target.value)}
                  placeholder="example@mail.ru"
                />
              </Card>

              <Card className="p-4 bg-secondary/30">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Итого к оплате</span>
                  <span className="text-xl font-bold text-primary">
                    {calculatePaymentAmount().toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="amount" className="p-4 space-y-6">
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground">Детали счёта</h3>
                {billItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-1">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-medium">{(item.remaining_amount || 0).toLocaleString('ru-RU')} ₽</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Осталось оплатить</span>
                  <span>{totalAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Введите сумму к оплате</label>
                  <div className="relative">
                    <Input 
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="0"
                      className="text-2xl font-bold h-16 pr-12"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">₽</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Чаевые</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[10, 15, 20].map((percent) => (
                    <Button
                      key={percent}
                      variant={splitTipPercentage === percent && !splitCustomTip ? "default" : "outline"}
                      onClick={() => {
                        setSplitTipPercentage(percent);
                        setSplitCustomTip('');
                      }}
                      className="h-12"
                    >
                      {percent}%
                    </Button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Своя сумма</Label>
                  <div className="relative">
                    <Input 
                      type="number"
                      value={splitCustomTip}
                      onChange={(e) => setSplitCustomTip(e.target.value)}
                      placeholder="0"
                      className="pr-10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
                  </div>
                </div>

                <div className="flex justify-between text-sm pt-2">
                  <span className="text-muted-foreground">Сумма чаевых</span>
                  <span className="font-medium">{calculateSplitTipAmount().toLocaleString('ru-RU')} ₽</span>
                </div>
              </Card>

              <Card className="p-4 space-y-3">
                <Label className="text-sm font-medium">Отправить чек на почту</Label>
                <Input 
                  type="email"
                  value={splitEmail}
                  onChange={(e) => setSplitEmail(e.target.value)}
                  placeholder="example@mail.ru"
                />
              </Card>

              <Card className="p-4 bg-secondary/30">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Итого к оплате</span>
                  <span className="text-xl font-bold text-primary">
                    {calculatePaymentAmount().toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              </Card>
            </TabsContent>
          </div>

          <div className="p-4 border-t bg-white">
            <Button 
              className="w-full h-14 text-lg font-semibold"
              size="lg"
              onClick={handlePayment}
              disabled={calculatePaymentAmount() === 0}
            >
              Оплатить {calculatePaymentAmount().toLocaleString('ru-RU')} ₽
            </Button>
          </div>
        </Tabs>
      </div>
    );
  }

  if (showBillDetails) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setShowBillDetails(false)}>
            <Icon name="ArrowLeft" size={24} />
          </Button>
          <h1 className="text-lg font-bold">Детали счёта</h1>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {billItems.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.price.toLocaleString('ru-RU')} ₽ × {item.quantity}
                  </p>
                </div>
                <p className="font-bold text-lg">{(item.remaining_amount || 0).toLocaleString('ru-RU')} ₽</p>
              </div>
            </Card>
          ))}

          <Separator className="my-4" />

          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Чаевые</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[10, 15, 20].map((percent) => (
                <Button
                  key={percent}
                  variant={tipPercentage === percent && !customTip ? "default" : "outline"}
                  onClick={() => {
                    setTipPercentage(percent);
                    setCustomTip('');
                  }}
                  className="h-12"
                >
                  {percent}%
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Своя сумма</Label>
              <div className="relative">
                <Input 
                  type="number"
                  value={customTip}
                  onChange={(e) => setCustomTip(e.target.value)}
                  placeholder="0"
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">₽</span>
              </div>
            </div>

            <div className="flex justify-between text-sm pt-2">
              <span className="text-muted-foreground">Сумма чаевых</span>
              <span className="font-medium">{calculateTipAmount().toLocaleString('ru-RU')} ₽</span>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <Label className="text-sm font-medium">Отправить чек на почту</Label>
            <Input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.ru"
            />
          </Card>

          <Card className="p-4 bg-secondary/30">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Сумма</span>
                <span>{totalAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Чаевые</span>
                <span>{calculateTipAmount().toLocaleString('ru-RU')} ₽</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between text-xl">
                <span className="font-bold">Итого</span>
                <span className="font-bold text-primary">{calculatePaymentAmount().toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </Card>
        </div>

        <div className="p-4 border-t bg-white">
          <Button 
            className="w-full h-14 text-lg font-semibold"
            size="lg"
            onClick={handlePayment}
          >
            Оплатить {calculatePaymentAmount().toLocaleString('ru-RU')} ₽
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="relative h-screen flex flex-col">
        <div 
          className="relative w-full h-3/4 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://cdn.poehali.dev/projects/bb24f7d2-9e3b-4da9-a9eb-565d4dab0f4c/files/26bff94b-1b7a-4806-b2be-8c7fb652b3f4.jpg')`
          }}
        >
          <div className="absolute inset-0 bg-black/20" />
          
          <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 md:p-6">
            <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-orange-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-bold">Z</span>
              </div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900">ZenZero</h1>
            </div>

            <button 
              onClick={() => setIsProfileOpen(true)}
              className="w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
            >
              <Icon name="User" size={20} className="text-gray-700" />
            </button>
          </div>

          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
            <div 
              className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white shadow-2xl bg-cover bg-center border-4 border-white"
              style={{
                backgroundImage: `url('https://cdn.poehali.dev/projects/bb24f7d2-9e3b-4da9-a9eb-565d4dab0f4c/files/9095771e-153a-4e14-badb-53e8c8b2a48e.jpg')`
              }}
            />
          </div>
        </div>

        <div className="flex-1 bg-white pt-16 px-4 md:px-6 pb-6 space-y-4">
          {isBillLoading ? (
            <Card className="border-2 border-primary bg-secondary/30 p-6 rounded-2xl">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center animate-pulse">
                  <Icon name="Loader2" size={32} className="text-primary animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900">Загрузка счёта</h2>
                  <p className="text-sm md:text-base text-gray-600">Ваш счёт скоро появится</p>
                </div>
              </div>
            </Card>
          ) : (
            <>
              <Card className="border-2 border-green-500 bg-green-50 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <Icon name="CheckCircle2" size={24} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Счёт готов</p>
                      <p className="text-2xl font-bold text-primary">{totalAmount.toLocaleString('ru-RU')} ₽</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Button 
                className="w-full h-14 rounded-2xl text-base md:text-lg font-semibold"
                variant="outline"
                onClick={() => setShowBillDetails(true)}
              >
                <Icon name="Receipt" size={20} className="mr-2" />
                Оплатить счёт целиком
              </Button>

              <Button 
                className="w-full h-14 rounded-2xl text-base md:text-lg font-semibold"
                variant="outline"
                onClick={() => setShowSplitOptions(true)}
              >
                <Icon name="Users" size={20} className="mr-2" />
                Разделить счёт
              </Button>
            </>
          )}
        </div>
      </div>

      <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span className="text-xl font-bold">Профиль</span>
              <button 
                onClick={() => setIsProfileOpen(false)}
                className="hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <Icon name="X" size={20} />
              </button>
            </SheetTitle>
          </SheetHeader>

          <div className="mt-8 space-y-6">
            <div className="flex items-center space-x-4 pb-6 border-b">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white text-2xl font-bold">
                А
              </div>
              <div>
                <h3 className="text-lg font-semibold">Анна Петрова</h3>
                <p className="text-sm text-muted-foreground">+7 999 123-45-67</p>
              </div>
            </div>

            <div>
              <h4 className="text-base font-semibold mb-4">Предыдущие счета</h4>
              <div className="space-y-3">
                {previousBills.map((bill) => (
                  <Card key={bill.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{bill.restaurant}</p>
                        <p className="text-xs text-muted-foreground">{bill.date}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-bold text-sm">{bill.amount.toLocaleString('ru-RU')} ₽</p>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          {bill.status}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Index;
