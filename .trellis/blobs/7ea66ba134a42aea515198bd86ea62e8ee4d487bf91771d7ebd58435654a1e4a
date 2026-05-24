/**
 * Calculator Widget
 * Basic calculator with history
 */

import * as React from 'react'
import { Delete, Divide, Minus, Plus, X, Equal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CalculatorWidgetData } from '@/lib/widgets'

interface CalculatorWidgetProps {
  data: CalculatorWidgetData
  onUpdate: (data: Partial<CalculatorWidgetData>) => void
}

export function CalculatorWidget({ data, onUpdate }: CalculatorWidgetProps) {
  const { state } = data
  const [expression, setExpression] = React.useState('')
  const [display, setDisplay] = React.useState(state.display || '0')

  const handleNumber = (num: string) => {
    if (display === '0' && num !== '.') {
      setDisplay(num)
    } else {
      setDisplay(display + num)
    }
    setExpression(expression + num)
  }

  const handleOperator = (op: string) => {
    setExpression(expression + ` ${op} `)
    setDisplay('0')
  }

  const handleClear = () => {
    setDisplay('0')
    setExpression('')
  }

  const handleBackspace = () => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1))
    } else {
      setDisplay('0')
    }
  }

  const handleEquals = () => {
    try {
      // Safe eval using Function constructor
      const sanitized = expression.replace(/×/g, '*').replace(/÷/g, '/')
      const result = new Function(`return ${sanitized}`)()
      const formatted = Number(result.toFixed(data.settings.precision)).toString()

      setDisplay(formatted)
      setExpression('')

      onUpdate({
        state: {
          ...state,
          display: formatted,
          history: [{ expression, result: formatted }, ...state.history.slice(0, 9)],
        },
      })
    } catch {
      setDisplay('Error')
    }
  }

  const buttons = [
    ['C', '⌫', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '−'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
  ]

  const getButtonAction = (btn: string) => {
    switch (btn) {
      case 'C':
        return handleClear
      case '⌫':
        return handleBackspace
      case '=':
        return handleEquals
      case '+':
      case '−':
      case '×':
      case '÷':
        return () => handleOperator(btn)
      default:
        return () => handleNumber(btn)
    }
  }

  return (
    <div className="p-3 space-y-3">
      {/* Display */}
      <div className="bg-muted/50 rounded-lg p-3 text-right">
        <div className="text-xs text-muted-foreground h-4 truncate">{expression || ' '}</div>
        <div className="text-2xl font-mono font-bold tabular-nums truncate">{display}</div>
      </div>

      {/* Buttons */}
      <div className="grid gap-1.5">
        {buttons.map((row, i) => (
          <div key={i} className="grid grid-cols-4 gap-1.5">
            {row.map((btn) => (
              <Button
                key={btn}
                variant={['C', '⌫', '÷', '×', '−', '+', '='].includes(btn) ? 'secondary' : 'outline'}
                className={cn(
                  'h-10 text-lg font-medium',
                  btn === '0' && 'col-span-2',
                  btn === '=' && 'bg-primary text-primary-foreground hover:bg-primary/90',
                )}
                onClick={getButtonAction(btn)}>
                {btn}
              </Button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
