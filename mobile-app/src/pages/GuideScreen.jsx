import React, { 
  useRef, 
  useCallback 
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Recycle, 
  Trash2, 
  AlertTriangle, 
  Leaf, 
  CheckCircle2,
  Globe,
  PhilippinePeso,
  Heart
} from 'lucide-react-native';

const GuideScreen = () => {
  const insets = useSafeAreaInsets();
  
  // 1. ADD A REF FOR THE SCROLLVIEW
  const scrollRef = useRef(null);

  // 2. ANIMATION VALUES
  const fadeAnim = useRef(
    new Animated.Value(0)
  ).current;

  const slideAnim = useRef(
    new Animated.Value(30)
  ).current;

  // 3. RESET SCROLL AND TRIGGER ANIMATION ON FOCUS
  useFocusEffect(
    useCallback(() => {
      // RESET SCROLL POSITION TO TOP INSTANTLY
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ 
          y: 0, 
          animated: false 
        });
      }

      // RESET ANIMATION VALUES
      fadeAnim.setValue(0);
      slideAnim.setValue(30);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();

      return () => {
        // Cleanup if necessary
      };
    }, [fadeAnim, slideAnim])
  );

  const categories = [
    {
      title: 'Biodegradable',
      subtitle: 'Organic waste that can decompose naturally',
      color: '#1B5E20',
      icon: Leaf,
      items: [['Food scraps and leftovers', 'Coffee grounds and tea bags'], ['Fruit and vegetable peels', 'Paper towels and napkins'], ['Garden waste (leaves, grass)', 'Eggshells']],
      proTip: 'Keep separate from other waste to prevent contamination. Can be composted at home.'
    },
    {
      title: 'Recyclable',
      subtitle: 'Materials that can be processed and reused',
      color: '#1E40AF',
      icon: Recycle,
      items: [['Plastic bottles and containers', 'Paper and cardboard'], ['Glass bottles and jars', 'Newspapers and magazines'], ['Metal cans (aluminum, steel)', 'Clean packaging materials']],
      proTip: 'Rinse containers before disposal. Remove caps and labels when possible.'
    },
    {
      title: 'Non-Recyclable',
      subtitle: 'General waste that cannot be recycled',
      color: '#B91C1C',
      icon: Trash2,
      items: [['Styrofoam and foam packaging', 'Broken ceramics and pottery'], ['Plastic bags and wrappers', 'Rubber products'], ['Contaminated paper', 'Mixed material items']],
      proTip: 'Minimize this type of waste by choosing reusable alternatives when shopping.'
    },
    {
      title: 'Special Waste',
      subtitle: 'Items requiring special handling',
      color: '#F97316',
      icon: AlertTriangle,
      items: [['Batteries (all types)', 'Paint and chemicals'], ['Electronics and gadgets', 'Medical waste'], ['Light bulbs and fluorescent tubes', 'Expired medications']],
      proTip: 'Never mix with regular waste. Contact local authorities for proper disposal locations.'
    }
  ];

  return (
    <View 
      style={styles.container}
    >
      <Animated.View 
        style={{ 
          flex: 1, 
          opacity: fadeAnim, 
          transform: [{ translateY: slideAnim }] 
        }}
      >
        <ScrollView 
          // 4. ATTACH THE REF HERE
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent, 
            { paddingBottom: insets.bottom + 20 }
          ]}
        >
          <LinearGradient
            colors={['#1BC774', '#003F20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerGradient}
          >
            <View 
              style={styles.headerIconBg}
            >
              <Recycle 
                color="#1B5E20" 
                size={40} 
                strokeWidth={2.5} 
              />
            </View>
            <Text 
              style={styles.headerTitle}
            >
              Waste Segregation Guide
            </Text>
            <Text 
              style={styles.headerSubtitle}
            >
              Learn the proper color-coding system for waste disposal
            </Text>
          </LinearGradient>

          <View 
            style={styles.quickRefContainer}
          >
            <View 
              style={styles.quickRefHeader}
            >
              <Text 
                style={styles.quickRefHeaderText}
              >
                Quick Color Reference
              </Text>
            </View>
            <View 
              style={styles.quickRefBody}
            >
              {categories.map((cat) => (
                <View 
                  key={cat.title} 
                  style={styles.refItem}
                >
                  <View 
                    style={[
                      styles.refIconBox, 
                      { backgroundColor: cat.color }
                    ]}
                  >
                    <cat.icon 
                      color="#fff" 
                      size={24} 
                    />
                  </View>
                  <Text 
                    style={styles.refLabel}
                  >
                    {cat.title}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {categories.map((cat) => (
            <View 
              key={cat.title} 
              style={[
                styles.catCard, 
                { 
                  borderColor: cat.color, 
                  borderWidth: 1.5 
                }
              ]}
            >
              <View 
                style={[
                  styles.catHeader, 
                  { backgroundColor: cat.color }
                ]}
              >
                <View 
                  style={styles.catIconCircle}
                >
                  <cat.icon 
                    color={cat.color} 
                    size={20} 
                    strokeWidth={3} 
                  />
                </View>
                <View>
                  <Text 
                    style={styles.catTitle}
                  >
                    {cat.title}
                  </Text>
                  <Text 
                    style={styles.catSubtitle}
                  >
                    {cat.subtitle}
                  </Text>
                </View>
              </View>
              <View 
                style={styles.catBody}
              >
                <Text 
                  style={styles.sectionTitle}
                >
                  What Goes Here:
                </Text>
                {cat.items.map((row, i) => (
                  <View 
                    key={i} 
                    style={styles.itemRow}
                  >
                    <View 
                      style={styles.itemCol}
                    >
                      <CheckCircle2 
                        size={14} 
                        color={cat.color} 
                      />
                      <Text 
                        style={styles.itemText}
                      >
                        {row[0]}
                      </Text>
                    </View>
                    <View 
                      style={styles.itemCol}
                    >
                      <CheckCircle2 
                        size={14} 
                        color={cat.color} 
                      />
                      <Text 
                        style={styles.itemText}
                      >
                        {row[1]}
                      </Text>
                    </View>
                  </View>
                ))}
                <View 
                  style={[
                    styles.proTipBox, 
                    { borderLeftColor: cat.color }
                  ]}
                >
                  <Text 
                    style={[
                      styles.proTipTitle, 
                      { color: cat.color }
                    ]}
                  >
                    Pro Tip:
                  </Text>
                  <Text 
                    style={styles.proTipText}
                  >
                    {cat.proTip}
                  </Text>
                </View>
              </View>
            </View>
          ))}

          <View 
            style={styles.mattersContainer}
          >
            <Text 
              style={styles.mattersHeaderTitle}
            >
              Why Proper Segregation Matters
            </Text>
            <View 
              style={styles.mattersGrid}
            >
              <MatterItem 
                icon={Globe} 
                title="Protect Environment" 
                desc="Reduces pollution and conserves natural resources" 
              />
              <MatterItem 
                icon={PhilippinePeso} 
                title="Save Money" 
                desc="Lower waste management costs for the community" 
              />
              <MatterItem 
                icon={Leaf} 
                title="Create Compost" 
                desc="Turn organic waste into nutrient-rich soil" 
              />
              <MatterItem 
                icon={Heart} 
                title="Healthier Community" 
                desc="Cleaner environment means better health for all" 
              />
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const MatterItem = ({ icon: Icon, title, desc }) => (
  <View 
    style={styles.matterCard}
  >
    <View 
      style={styles.matterIconBg}
    >
      <Icon 
        color="#1B5E20" 
        size={20} 
      />
    </View>
    <View 
      style={styles.matterTextContainer}
    >
      <Text 
        style={styles.matterTitleText}
      >
        {title}
      </Text>
      <Text 
        style={styles.matterDescText}
      >
        {desc}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#E3F3DF' 
  },
  scrollContent: { 
    padding: 15 
  },
  headerGradient: { 
    borderRadius: 20, 
    padding: 25, 
    alignItems: 'center', 
    marginBottom: 20 
  },
  headerIconBg: { 
    backgroundColor: '#fff', 
    padding: 12, 
    borderRadius: 50, 
    marginBottom: 12 
  },
  headerTitle: { 
    color: '#fff', 
    fontSize: 22, 
    fontWeight: '900' 
  },
  headerSubtitle: { 
    color: '#E3F3DF', 
    fontSize: 12, 
    textAlign: 'center', 
    marginTop: 5, 
    fontWeight: '500' 
  },
  quickRefContainer: { 
    backgroundColor: '#F6FBF6', 
    borderRadius: 20, 
    overflow: 'hidden', 
    marginBottom: 25, 
    elevation: 4, 
    shadowColor: '#000', 
    shadowOpacity: 0.1, 
    shadowRadius: 10 
  },
  quickRefHeader: { 
    backgroundColor: '#D9D9D9', 
    padding: 12 
  },
  quickRefHeaderText: { 
    fontSize: 14, 
    fontWeight: '900', 
    color: '#000' 
  },
  quickRefBody: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingVertical: 15 
  },
  refItem: { 
    alignItems: 'center' 
  },
  refIconBox: { 
    width: 50, 
    height: 50, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 6 
  },
  refLabel: { 
    fontSize: 9, 
    fontWeight: '700', 
    color: '#334155' 
  },
  catCard: { 
    backgroundColor: '#F6FBF6', 
    borderRadius: 20, 
    overflow: 'hidden', 
    marginBottom: 20, 
    elevation: 4 
  },
  catHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 15, 
    gap: 12 
  },
  catIconCircle: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  catTitle: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: '900' 
  },
  catSubtitle: { 
    color: 'rgba(255,255,255,0.8)', 
    fontSize: 11 
  },
  catBody: { 
    padding: 15 
  },
  sectionTitle: { 
    fontSize: 13, 
    fontWeight: '800', 
    marginBottom: 10, 
    color: '#334155' 
  },
  itemRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8 
  },
  itemCol: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    width: '48%' 
  },
  itemText: { 
    fontSize: 10, 
    color: '#64748b', 
    fontWeight: '600' 
  },
  proTipBox: { 
    marginTop: 15, 
    padding: 12, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 12, 
    borderLeftWidth: 4 
  },
  proTipTitle: { 
    fontSize: 12, 
    fontWeight: '900' 
  },
  proTipText: { 
    fontSize: 10, 
    fontStyle: 'italic', 
    color: '#64748b', 
    marginTop: 2 
  },
  mattersContainer: { 
    backgroundColor: '#EFFFF4', 
    borderRadius: 20, 
    padding: 20, 
    marginTop: 10, 
    borderWidth: 1, 
    borderColor: '#B7F0D0' 
  },
  mattersHeaderTitle: { 
    fontSize: 18, 
    fontWeight: '900', 
    textAlign: 'center', 
    marginBottom: 20, 
    color: '#003F20' 
  },
  mattersGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    gap: 12 
  },
  matterCard: { 
    width: '48%', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 10, 
    flexDirection: 'row', 
    gap: 10, 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 5 
  },
  matterIconBg: { 
    backgroundColor: '#EAF5E8', 
    width: 34, 
    height: 34, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  matterTextContainer: { 
    flex: 1 
  },
  matterTitleText: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#000' 
  },
  matterDescText: { 
    fontSize: 8, 
    color: '#64748b', 
    marginTop: 2, 
    lineHeight: 11 
  },
});

export default GuideScreen;