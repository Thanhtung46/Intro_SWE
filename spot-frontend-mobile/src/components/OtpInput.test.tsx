import { fireEvent, render } from '@testing-library/react-native';
import React, { useState } from 'react';
import { OtpInput } from './OtpInput';

function Controlled({ onComplete }: { onComplete?: (value: string) => void }) {
  const [value, setValue] = useState('');
  return <OtpInput value={value} onChange={setValue} onComplete={onComplete} />;
}

describe('OtpInput', () => {
  it('renders 6 boxes by default', () => {
    const { getByTestId } = render(<Controlled />);
    for (let i = 0; i < 6; i += 1) {
      expect(getByTestId(`otp-input-${i}`)).toBeTruthy();
    }
  });

  it('accumulates one digit per box as the user types', () => {
    const { getByTestId } = render(<Controlled />);

    fireEvent.changeText(getByTestId('otp-input-0'), '1');
    fireEvent.changeText(getByTestId('otp-input-1'), '2');
    fireEvent.changeText(getByTestId('otp-input-2'), '3');

    expect(getByTestId('otp-input-0').props.value).toBe('1');
    expect(getByTestId('otp-input-1').props.value).toBe('2');
    expect(getByTestId('otp-input-2').props.value).toBe('3');
  });

  it('clears the previous box on backspace when the current box is already empty', () => {
    const { getByTestId } = render(<Controlled />);

    fireEvent.changeText(getByTestId('otp-input-0'), '1');
    fireEvent(getByTestId('otp-input-1'), 'keyPress', { nativeEvent: { key: 'Backspace' } });

    expect(getByTestId('otp-input-0').props.value).toBe('');
  });

  it('distributes a 6-digit paste across all boxes and fires onComplete', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<Controlled onComplete={onComplete} />);

    fireEvent.changeText(getByTestId('otp-input-0'), '123456');

    for (let i = 0; i < 6; i += 1) {
      expect(getByTestId(`otp-input-${i}`).props.value).toBe(String(i + 1));
    }
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('fires onComplete once the 6th digit is typed one box at a time', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<Controlled onComplete={onComplete} />);

    ['1', '2', '3', '4', '5', '6'].forEach((digit, index) => {
      fireEvent.changeText(getByTestId(`otp-input-${index}`), digit);
    });

    expect(onComplete).toHaveBeenCalledWith('123456');
  });
});
