import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';

const Index = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const previousBills = [
    { id: 1, restaurant: 'Ресторан "Bella Vista"', date: '15 ноя 2025', amount: 4250, status: 'Оплачено' },
    { id: 2, restaurant: 'Кафе "Coffee Dreams"', date: '12 ноя 2025', amount: 890, status: 'Оплачено' },
    { id: 3, restaurant: 'Ресторан "Токио"', date: '8 ноя 2025', amount: 5670, status: 'Оплачено' }
  ];

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
          <Card className="border-2 border-primary bg-secondary/30 p-6 rounded-2xl">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center">
                <Icon name="AlertCircle" size={32} className="text-primary" />
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Загрузка счёта</h2>
                <p className="text-sm md:text-base text-gray-600">Ваш счёт скоро появится</p>
              </div>
            </div>
          </Card>

          <Button 
            className="w-full h-14 rounded-2xl text-base md:text-lg font-semibold border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            variant="outline"
          >
            Оплатить счёт целиком
          </Button>
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
