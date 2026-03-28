import { Typography } from '@/components/ui/text';
import { useThemeColor } from '@/hooks/use-theme-color';
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

interface DateCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  value?: Date;
  title?: string;
  onConfirm: (date: Date) => void;
  allowClear?: boolean;
  onClear?: () => void;
}

const formatDateKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const buildCalendarDays = (year: number, month: number): Date[] => {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const padding = firstDay.getDay();

  for (let index = padding - 1; index >= 0; index -= 1) {
    days.push(new Date(year, month, -index));
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(new Date(year, month + 1, days.length - padding - lastDay.getDate() + 1));
  }

  return days;
};

export const DateCalendarModal: React.FC<DateCalendarModalProps> = ({
  visible,
  onClose,
  value,
  title = 'Select Date',
  onConfirm,
  allowClear = false,
  onClear,
}) => {
  const card = useThemeColor({}, 'card');
  const text = useThemeColor({}, 'text');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const primary = useThemeColor({}, 'primary');

  const [calendarMonth, setCalendarMonth] = useState<number>((value || new Date()).getMonth());
  const [calendarYear, setCalendarYear] = useState<number>((value || new Date()).getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date>(value || new Date());

  useEffect(() => {
    if (!visible) return;
    const sourceDate = value || new Date();
    setCalendarMonth(sourceDate.getMonth());
    setCalendarYear(sourceDate.getFullYear());
    setSelectedDate(sourceDate);
  }, [visible, value]);

  const days = useMemo(() => buildCalendarDays(calendarYear, calendarMonth), [calendarMonth, calendarYear]);
  const monthName = useMemo(
    () => new Date(calendarYear, calendarMonth, 1).toLocaleString(undefined, { month: 'long' }),
    [calendarYear, calendarMonth]
  );

  const selectedKey = formatDateKey(selectedDate);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalContent, { backgroundColor: card }]}> 
          <View style={styles.calendarHeaderRow}>
            <TouchableOpacity
              onPress={() => {
                const nextMonth = calendarMonth === 0 ? 11 : calendarMonth - 1;
                const nextYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
                setCalendarMonth(nextMonth);
                setCalendarYear(nextYear);
              }}
            >
              <Typography style={[styles.calendarNav, { color: primary }]}>{'<'}</Typography>
            </TouchableOpacity>
            <Typography style={[styles.calendarTitle, { color: text }]}>{monthName} {calendarYear}</Typography>
            <TouchableOpacity
              onPress={() => {
                const nextMonth = calendarMonth === 11 ? 0 : calendarMonth + 1;
                const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
                setCalendarMonth(nextMonth);
                setCalendarYear(nextYear);
              }}
            >
              <Typography style={[styles.calendarNav, { color: primary }]}>{'>'}</Typography>
            </TouchableOpacity>
          </View>

          <Typography variant="small" style={{ color: mutedForeground, textAlign: 'center', marginBottom: 8 }}>
            {title}
          </Typography>

          <View style={styles.weekRow}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <Typography key={day} style={styles.weekDayText}>{day}</Typography>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {days.map((day, index) => {
              const dateKey = formatDateKey(day);
              const isOtherMonth = day.getMonth() !== calendarMonth;
              const isSelected = dateKey === selectedKey;

              return (
                <TouchableOpacity
                  key={`${dateKey}-${index}`}
                  onPress={() => setSelectedDate(day)}
                  style={[
                    styles.dayCell,
                    isOtherMonth && styles.dayCellFaded,
                    isSelected && [styles.dayCellSelected, { backgroundColor: primary }],
                  ]}
                >
                  <Typography
                    style={[
                      styles.dayText,
                      { color: text },
                      isOtherMonth && styles.dayTextFaded,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {day.getDate()}
                  </Typography>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actionsRow}>
            {allowClear ? (
              <TouchableOpacity
                style={styles.actionGhost}
                onPress={() => {
                  onClear?.();
                  onClose();
                }}
              >
                <Typography style={{ color: '#ef4444' }}>Clear</Typography>
              </TouchableOpacity>
            ) : (
              <View style={styles.actionGhost} />
            )}

            <TouchableOpacity
              style={[styles.actionPrimary, { backgroundColor: primary }]}
              onPress={() => {
                onConfirm(selectedDate);
                onClose();
              }}
            >
              <Typography variant="bold" style={{ color: '#FFFFFF' }}>OK</Typography>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContent: {
    width: '92%',
    borderRadius: 28,
    padding: 20,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  calendarNav: {
    fontSize: 24,
    fontWeight: '300',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekDayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellFaded: {
    opacity: 0.2,
  },
  dayCellSelected: {
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
  },
  dayTextFaded: {
    color: '#94a3b8',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    alignItems: 'center',
  },
  actionGhost: {
    minWidth: 70,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  actionPrimary: {
    minWidth: 76,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
});

export default DateCalendarModal;
