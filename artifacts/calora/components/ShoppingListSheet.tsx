import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/components/BottomSheet';
import { useCalora, type ShoppingItem } from '@/context/CaloraContext';

const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

function formatDay(day: string): string {
  return dayFormatter.format(new Date(`${day}T12:00:00`));
}

function formatShoppingDays(days: string[] | undefined): string {
  if (!days || days.length === 0) return '';
  return days.map(formatDay).join(' · ');
}

type ShoppingListSheetProps = {
  visible: boolean;
  items: ShoppingItem[];
  weekDays: string[];
  initialDayFilter?: string | null;
  onClose: () => void;
  onToggleItem: (name: string) => void;
};

export function ShoppingListSheet({ visible, items, weekDays, initialDayFilter = null, onClose, onToggleItem }: ShoppingListSheetProps) {
  const { colors, fontScale } = useCalora();
  const styles = useMemo(() => makeStyles(fontScale), [fontScale]);
  const [dayFilter, setDayFilter] = useState<string | null>(null);

  useEffect(() => {
    setDayFilter(visible ? initialDayFilter : null);
  }, [initialDayFilter, visible]);

  const shoppingDays = useMemo(
    () => weekDays.filter((day) => items.some((item) => item.days?.includes(day))),
    [items, weekDays],
  );
  const filteredItems = useMemo(
    () => dayFilter ? items.filter((item) => item.days?.includes(dayFilter)) : items,
    [dayFilter, items],
  );

  const close = () => {
    setDayFilter(null);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onRequestClose={close} sheetStyle={[styles.sheet, { backgroundColor: colors.background }]}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>THIS WEEK</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Shopping list</Text>
        </View>
        <Pressable accessibilityLabel="Close shopping list" onPress={close} hitSlop={8} style={[styles.closeButton, { backgroundColor: colors.muted }]}>
          <Feather name="x" size={18} color={colors.foreground} />
        </Pressable>
      </View>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Ingredients for this week.</Text>
      {shoppingDays.length > 1 && (
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
            <Pressable
              accessibilityLabel="Show all days"
              onPress={() => setDayFilter(null)}
              style={[styles.dayPill, { borderColor: dayFilter === null ? colors.primary : colors.input, backgroundColor: dayFilter === null ? colors.primary : colors.muted }]}
            >
              <Text style={[styles.dayPillText, { color: dayFilter === null ? colors.primaryForeground : colors.foreground }]}>All</Text>
            </Pressable>
            {shoppingDays.map((day) => {
              const active = dayFilter === day;
              return (
                <Pressable
                  key={day}
                  accessibilityLabel={`Filter by ${formatDay(day)}`}
                  onPress={() => setDayFilter(active ? null : day)}
                  style={[styles.dayPill, { borderColor: active ? colors.primary : colors.input, backgroundColor: active ? colors.primary : colors.muted }]}
                >
                  <Text style={[styles.dayPillText, { color: active ? colors.primaryForeground : colors.foreground }]}>{formatDay(day)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false} style={styles.ingredientScroll} contentContainerStyle={{ paddingBottom: 34 }}>
        {filteredItems.map((item) => (
          <Pressable key={item.id} accessibilityLabel={`${item.checked ? 'Uncheck' : 'Check'} ${item.name}`} onPress={() => onToggleItem(item.name)} style={[styles.row, { borderBottomColor: colors.border }]}>
            <View style={[styles.checkbox, { borderColor: item.checked ? colors.success : colors.input, backgroundColor: item.checked ? colors.success : 'transparent' }]}>
              {item.checked && <Feather name="check" size={13} color={colors.primaryForeground} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: item.checked ? colors.mutedForeground : colors.foreground, textDecorationLine: item.checked ? 'line-through' : 'none' }]}>{item.name}</Text>
              {!!formatShoppingDays(item.days) && <Text style={[styles.days, { color: item.checked ? colors.mutedForeground : colors.primary, opacity: item.checked ? 0.55 : 0.75 }]}>{formatShoppingDays(item.days)}</Text>}
            </View>
            <Text style={[styles.quantity, { color: colors.mutedForeground }]}>{item.quantity}×</Text>
          </Pressable>
        ))}
        {filteredItems.length === 0 && (
          <Text style={[styles.subtitle, { color: colors.mutedForeground, textAlign: 'center', marginTop: 24 }]}>No items for this day.</Text>
        )}
      </ScrollView>
    </BottomSheet>
  );
}

function makeStyles(f: number) {
  return StyleSheet.create({
    sheet: { flex: 1, paddingTop: 16, paddingHorizontal: 20 },
    handle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#b7c5bc', alignSelf: 'center', marginVertical: 11 },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9 * f, letterSpacing: 1.1 },
    title: { fontFamily: 'Inter_700Bold', fontSize: 24 * f, letterSpacing: -0.5, marginTop: 5 },
    closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
    subtitle: { fontFamily: 'Inter_400Regular', fontSize: 11 * f, lineHeight: 16, marginTop: 8, marginBottom: 12 },
    filterSection: { marginBottom: 16 },
    filterContent: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 2 },
    dayPill: { flexShrink: 0, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    dayPillText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f, lineHeight: 15 },
    ingredientScroll: { flex: 1, minHeight: 0 },
    row: { minHeight: 46, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    name: { fontFamily: 'Inter_500Medium', fontSize: 12 * f },
    days: { fontFamily: 'Inter_400Regular', fontSize: 10 * f, marginTop: 1 },
    quantity: { fontFamily: 'Inter_600SemiBold', fontSize: 11 * f },
  });
}