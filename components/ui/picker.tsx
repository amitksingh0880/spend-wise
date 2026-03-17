import { useThemeColor } from '@/hooks/use-theme-color';
import { ChevronDown, Check, Search, X } from 'lucide-react-native';
import React, { useState, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  SafeAreaView,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';

export interface PickerOption {
  label: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
}

interface PickerProps {
  options: PickerOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
}

export const Picker = ({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option...',
  label,
  error,
  searchable = false,
  searchPlaceholder = 'Search...',
  disabled = false,
}: PickerProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const mutedForeground = useThemeColor({}, 'mutedForeground');
  const destructive = useThemeColor({}, 'destructive');
  const primary = useThemeColor({}, 'primary');
  const primaryForeground = useThemeColor({}, 'primaryForeground');

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return options;
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [options, searchQuery]);

  const handleSelect = (val: string) => {
    onValueChange(val);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
      
      <TouchableOpacity
        style={[
          styles.trigger,
          { 
            backgroundColor, 
            borderColor: error ? destructive : borderColor,
          },
          disabled && styles.disabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.triggerText,
            { color: selectedOption ? textColor : mutedForeground },
          ]}
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={20} color={mutedForeground} />
      </TouchableOpacity>

      {error && <Text style={[styles.error, { color: destructive }]}>{error}</Text>}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { backgroundColor }]}>
                <SafeAreaView style={styles.safeArea}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: textColor }]}>
                      {label || 'Select Option'}
                    </Text>
                    <TouchableOpacity onPress={() => setModalVisible(false)}>
                      <X size={24} color={mutedForeground} />
                    </TouchableOpacity>
                  </View>

                  {searchable && (
                    <View style={[styles.searchContainer, { backgroundColor: cardColor, borderColor }]}>
                      <Search size={18} color={mutedForeground} style={styles.searchIcon} />
                      <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder={searchPlaceholder}
                        placeholderTextColor={mutedForeground}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                      />
                    </View>
                  )}

                  <FlatList
                    data={filteredOptions}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => {
                      const isSelected = item.value === value;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.optionItem,
                            isSelected && { backgroundColor: cardColor },
                          ]}
                          onPress={() => handleSelect(item.value)}
                        >
                          <View style={styles.optionContent}>
                            {item.icon && <View style={styles.optionIcon}>{item.icon}</View>}
                            <View>
                              <Text style={[styles.optionLabel, { color: textColor }]}>
                                {item.label}
                              </Text>
                              {item.description && (
                                <Text style={[styles.optionDesc, { color: mutedForeground }]}>
                                  {item.description}
                                </Text>
                              )}
                            </View>
                          </View>
                          {isSelected && <Check size={20} color={primary} />}
                        </TouchableOpacity>
                      );
                    }}
                    ListEmptyComponent={
                      <View style={styles.emptyContent}>
                        <Text style={{ color: mutedForeground }}>No options found</Text>
                      </View>
                    }
                  />
                </SafeAreaView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  trigger: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerText: {
    fontSize: 16,
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  error: {
    fontSize: 12,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  safeArea: {
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    margin: 16,
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyContent: {
    padding: 40,
    alignItems: 'center',
  },
});

export default Picker;
