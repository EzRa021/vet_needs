import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"

export function TransactionItem({ 
  item, 
  isSelected, 
  onToggle, 
  quantity = 0,
  maxQuantity = 0,
  onQuantityChange 
}) {
  return (
    <div className="flex items-center space-x-4 p-2 border rounded-md">
      <Checkbox 
        checked={isSelected} 
        onCheckedChange={onToggle} 
        id={item.id} 
      />
      <div className="flex-grow">
        <label htmlFor={item.id} className="cursor-pointer">
          <div className="font-medium">{item.name}</div>
          <div className="text-sm text-gray-500">
            Quantity: {item.quantity} | Price: ${item.price.toFixed(2)}
          </div>
        </label>
      </div>
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-500">Return:</span>
        <Input 
          type="number" 
          min="0" 
          max={maxQuantity}
          value={quantity}
          onChange={(e) => onQuantityChange(Number(e.target.value))}
          className="w-20 h-8"
          disabled={!isSelected}
        />
      </div>
    </div>
  )
}