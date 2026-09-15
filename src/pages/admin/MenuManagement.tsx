import React, { useState } from 'react';
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { useCateringData } from '@/hooks/useCateringData';
import { formatCurrency } from '@/lib/utils';
import { MenuItem, Package, EventTheme, RentalItem } from '@/types/database';

export function MenuManagement() {
  const {
    menuItems,
    categories,
    packages,
    themes,
    rentals,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    addPackage,
    updatePackage,
    deletePackage,
    addTheme,
    updateTheme,
    addRentalItem,
    updateRentalItem,
  } = useCateringData();

  const [activeTab, setActiveTab] = useState('items');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Dialog States
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    category_id: 1,
    description: '',
    price_per_head: 120,
    is_available: true,
  });

  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    price_per_pax: 500,
    min_pax: 50,
    theme_id: '' as string | number,
  });

  const [rentalDialogOpen, setRentalDialogOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<RentalItem | null>(null);
  const [rentalForm, setRentalForm] = useState({
    name: '',
    category: 'Seating',
    rate_per_unit: 100,
    stock_quantity: 50,
    is_available: true,
  });

  // --- Handlers for Menu Items ---
  const handleOpenItemDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setItemForm({
        name: item.name,
        category_id: item.category_id,
        description: item.description || '',
        price_per_head: item.price_per_head,
        is_available: item.is_available,
      });
    } else {
      setEditingItem(null);
      setItemForm({
        name: '',
        category_id: categories[0]?.id || 1,
        description: '',
        price_per_head: 120,
        is_available: true,
      });
    }
    setItemDialogOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      await updateMenuItem(editingItem.id, {
        name: itemForm.name,
        category_id: Number(itemForm.category_id),
        description: itemForm.description,
        price_per_head: Number(itemForm.price_per_head),
        is_available: itemForm.is_available,
      });
    } else {
      await addMenuItem({
        name: itemForm.name,
        category_id: Number(itemForm.category_id),
        description: itemForm.description,
        price_per_head: Number(itemForm.price_per_head),
        is_available: itemForm.is_available,
      });
    }
    setItemDialogOpen(false);
  };

  // --- Handlers for Packages ---
  const handleOpenPackageDialog = (pkg?: Package) => {
    if (pkg) {
      setEditingPackage(pkg);
      setPackageForm({
        name: pkg.name,
        description: pkg.description || '',
        price_per_pax: pkg.price_per_pax,
        min_pax: pkg.min_pax,
        theme_id: pkg.theme_id || '',
      });
    } else {
      setEditingPackage(null);
      setPackageForm({
        name: '',
        description: '',
        price_per_pax: 550,
        min_pax: 50,
        theme_id: '',
      });
    }
    setPackageDialogOpen(true);
  };

  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    const themeIdNum = packageForm.theme_id ? Number(packageForm.theme_id) : null;
    if (editingPackage) {
      await updatePackage(editingPackage.id, {
        name: packageForm.name,
        description: packageForm.description,
        price_per_pax: Number(packageForm.price_per_pax),
        min_pax: Number(packageForm.min_pax),
        theme_id: themeIdNum,
      });
    } else {
      await addPackage({
        name: packageForm.name,
        description: packageForm.description,
        price_per_pax: Number(packageForm.price_per_pax),
        min_pax: Number(packageForm.min_pax),
        theme_id: themeIdNum,
      });
    }
    setPackageDialogOpen(false);
  };

  // --- Handlers for Rentals ---
  const handleOpenRentalDialog = (rental?: RentalItem) => {
    if (rental) {
      setEditingRental(rental);
      setRentalForm({
        name: rental.name,
        category: rental.category,
        rate_per_unit: rental.rate_per_unit,
        stock_quantity: rental.stock_quantity,
        is_available: rental.is_available,
      });
    } else {
      setEditingRental(null);
      setRentalForm({
        name: '',
        category: 'Seating',
        rate_per_unit: 100,
        stock_quantity: 50,
        is_available: true,
      });
    }
    setRentalDialogOpen(true);
  };

  const handleSaveRental = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRental) {
      await updateRentalItem(editingRental.id, {
        name: rentalForm.name,
        category: rentalForm.category,
        rate_per_unit: Number(rentalForm.rate_per_unit),
        stock_quantity: Number(rentalForm.stock_quantity),
        is_available: rentalForm.is_available,
      });
    } else {
      await addRentalItem({
        name: rentalForm.name,
        category: rentalForm.category,
        rate_per_unit: Number(rentalForm.rate_per_unit),
        stock_quantity: Number(rentalForm.stock_quantity),
        is_available: rentalForm.is_available,
      });
    }
    setRentalDialogOpen(false);
  };

  // Filtered menu items
  const filteredMenuItems = menuItems.filter(item => {
    const matchSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat =
      selectedCategory === 'all' || item.category_id.toString() === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6">
      {/* Header with Title and Add Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Catalog & Menu Management</h2>
          <p className="text-sm text-text-muted">
            Configure dishes, catering packages, event motifs, and rental inventory.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'items' && (
            <Button variant="gold" onClick={() => handleOpenItemDialog()} className="gap-1.5 text-sm">
              <Plus className="h-4 w-4" /> Add Food Item
            </Button>
          )}
          {activeTab === 'packages' && (
            <Button variant="gold" onClick={() => handleOpenPackageDialog()} className="gap-1.5 text-sm">
              <Plus className="h-4 w-4" /> Add Package
            </Button>
          )}
          {activeTab === 'rentals' && (
            <Button variant="gold" onClick={() => handleOpenRentalDialog()} className="gap-1.5 text-sm">
              <Plus className="h-4 w-4" /> Add Equipment
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="items">Dishes & Food ({menuItems.length})</TabsTrigger>
          <TabsTrigger value="packages">Packages ({packages.length})</TabsTrigger>
          <TabsTrigger value="themes">Event Themes ({themes.length})</TabsTrigger>
          <TabsTrigger value="rentals">Rentals ({rentals.length})</TabsTrigger>
        </TabsList>

        {/* Tab 1: Menu Items */}
        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
                  <Input
                    placeholder="Search dishes..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
                <div className="w-48">
                  <Select
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="text-xs"
                  >
                    <option value="all">All Categories</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id.toString()}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-cream-dark/60 border-b border-border text-xs uppercase font-semibold text-text-muted">
                    <tr>
                      <th className="px-6 py-3.5">Dish Name & Description</th>
                      <th className="px-6 py-3.5">Category</th>
                      <th className="px-6 py-3.5">Price/Head</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredMenuItems.map(item => {
                      const cat = categories.find(c => c.id === item.category_id);
                      return (
                        <tr key={item.id} className="hover:bg-cream/40 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="font-semibold text-ink">{item.name}</div>
                            <div className="text-xs text-text-muted line-clamp-1">
                              {item.description || '—'}
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-xs text-text-muted">
                            <span className="rounded-md bg-cream-dark px-2 py-1 font-medium">
                              {cat?.name || 'Unassigned'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-semibold text-ink text-xs">
                            {formatCurrency(item.price_per_head)}
                          </td>
                          <td className="px-6 py-3.5">
                            <button
                              onClick={() =>
                                updateMenuItem(item.id, { is_available: !item.is_available })
                              }
                              className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                            >
                              {item.is_available ? (
                                <span className="text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Available
                                </span>
                              ) : (
                                <span className="text-rose-700 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                  <XCircle className="h-3.5 w-3.5" /> Sold Out
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleOpenItemDialog(item)}
                                className="rounded p-1.5 text-text-muted hover:bg-cream-dark hover:text-gold transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => deleteMenuItem(item.id)}
                                className="rounded p-1.5 text-text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Packages */}
        <TabsContent value="packages" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {packages.map(pkg => {
              const th = themes.find(t => t.id === pkg.theme_id);
              return (
                <Card key={pkg.id} className="flex flex-col justify-between">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-serif text-lg font-bold text-ink">{pkg.name}</h3>
                      <Badge variant="gold">Min {pkg.min_pax} pax</Badge>
                    </div>
                    <div className="mt-2 text-2xl font-serif font-bold text-gold-dark">
                      {formatCurrency(pkg.price_per_pax)}
                      <span className="text-xs font-normal text-text-muted font-sans"> / head</span>
                    </div>
                    {th && (
                      <p className="mt-1 text-xs text-text-muted">
                        Associated Theme: <span className="font-semibold text-text">{th.name}</span>
                      </p>
                    )}
                    <p className="mt-3 text-xs text-text-muted leading-relaxed">
                      {pkg.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-border p-4 bg-cream/30">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPackageDialog(pkg)}
                      className="gap-1 text-xs"
                    >
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletePackage(pkg.id)}
                      className="gap-1 text-xs"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 3: Themes */}
        <TabsContent value="themes" className="space-y-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {themes.map(theme => (
              <Card key={theme.id} className="overflow-hidden">
                <div
                  className="h-44 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${theme.image_url})` }}
                />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-ink">{theme.name}</h3>
                    <Badge variant={theme.is_active ? 'completed' : 'default'}>
                      {theme.is_active ? 'Active' : 'Archived'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs font-medium text-gold-dark italic">
                    "{theme.tagline}"
                  </p>
                  <p className="mt-2 text-xs text-text-muted leading-relaxed line-clamp-3">
                    {theme.description}
                  </p>
                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <button
                      onClick={() => updateTheme(theme.id, { is_active: !theme.is_active })}
                      className="text-xs font-medium text-text-muted hover:text-ink underline"
                    >
                      {theme.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <span className="text-[11px] text-text-faint">ID #{theme.id}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 4: Rental Items */}
        <TabsContent value="rentals" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-cream-dark/60 border-b border-border text-xs uppercase font-semibold text-text-muted">
                    <tr>
                      <th className="px-6 py-3.5">Equipment Name</th>
                      <th className="px-6 py-3.5">Category</th>
                      <th className="px-6 py-3.5">Rental Rate</th>
                      <th className="px-6 py-3.5">Available Stock</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rentals.map(rental => (
                      <tr key={rental.id} className="hover:bg-cream/40 transition-colors">
                        <td className="px-6 py-4 font-semibold text-ink">{rental.name}</td>
                        <td className="px-6 py-4 text-xs">
                          <span className="rounded-md bg-cream-dark px-2.5 py-1 text-text-muted font-medium">
                            {rental.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-ink text-xs">
                          {formatCurrency(rental.rate_per_unit)} / unit
                        </td>
                        <td className="px-6 py-4 text-xs font-medium">
                          {rental.stock_quantity} units
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRentalDialog(rental)}
                            className="gap-1 text-xs"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Add/Edit Menu Item */}
      <Dialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        title={editingItem ? 'Edit Dish / Food Item' : 'Add New Food Item'}
        description="Configure dish pricing and catering menu availability."
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
              Dish Name
            </label>
            <Input
              required
              value={itemForm.name}
              onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
              placeholder="e.g. Beef Caldereta"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
                Category
              </label>
              <Select
                value={itemForm.category_id}
                onChange={e => setItemForm({ ...itemForm, category_id: Number(e.target.value) })}
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
                Price Per Head (PHP)
              </label>
              <Input
                type="number"
                required
                value={itemForm.price_per_head}
                onChange={e => setItemForm({ ...itemForm, price_per_head: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
              Description & Inclusions
            </label>
            <Textarea
              rows={3}
              value={itemForm.description}
              onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
              placeholder="Flavor notes, sauce ingredients, presentation style..."
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_avail"
              checked={itemForm.is_available}
              onChange={e => setItemForm({ ...itemForm, is_available: e.target.checked })}
              className="h-4 w-4 rounded border-border text-gold focus:ring-gold"
            />
            <label htmlFor="is_avail" className="text-sm font-medium text-text">
              Mark as currently available for catering packages
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setItemDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold">
              Save Item
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Add/Edit Package */}
      <Dialog
        open={packageDialogOpen}
        onOpenChange={setPackageDialogOpen}
        title={editingPackage ? 'Edit Catering Package' : 'Create Catering Package'}
        description="Set pricing per guest and menu bundle inclusions."
      >
        <form onSubmit={handleSavePackage} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
              Package Name
            </label>
            <Input
              required
              value={packageForm.name}
              onChange={e => setPackageForm({ ...packageForm, name: e.target.value })}
              placeholder="e.g. Diamond Grand Feast"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
                Rate / Pax (PHP)
              </label>
              <Input
                type="number"
                required
                value={packageForm.price_per_pax}
                onChange={e => setPackageForm({ ...packageForm, price_per_pax: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
                Minimum Pax
              </label>
              <Input
                type="number"
                required
                value={packageForm.min_pax}
                onChange={e => setPackageForm({ ...packageForm, min_pax: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
              Linked Event Theme (Optional)
            </label>
            <Select
              value={packageForm.theme_id}
              onChange={e => setPackageForm({ ...packageForm, theme_id: e.target.value })}
            >
              <option value="">Any Theme (Universal Package)</option>
              {themes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
              Inclusions & Course Breakdown
            </label>
            <Textarea
              rows={4}
              value={packageForm.description}
              onChange={e => setPackageForm({ ...packageForm, description: e.target.value })}
              placeholder="Course selections, beverage inclusions, service crew details..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setPackageDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold">
              Save Package
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal: Add/Edit Rental Item */}
      <Dialog
        open={rentalDialogOpen}
        onOpenChange={setRentalDialogOpen}
        title={editingRental ? 'Edit Rental Item' : 'Add Rental Equipment'}
        description="Maintain party furniture and catering equipment stock."
      >
        <form onSubmit={handleSaveRental} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
              Equipment Name
            </label>
            <Input
              required
              value={rentalForm.name}
              onChange={e => setRentalForm({ ...rentalForm, name: e.target.value })}
              placeholder="e.g. Tiffany Gold Chairs"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
                Category
              </label>
              <Input
                value={rentalForm.category}
                onChange={e => setRentalForm({ ...rentalForm, category: e.target.value })}
                placeholder="Seating / Linens / Tables"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
                Rate / Unit (PHP)
              </label>
              <Input
                type="number"
                required
                value={rentalForm.rate_per_unit}
                onChange={e => setRentalForm({ ...rentalForm, rate_per_unit: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-text-muted mb-1">
              Stock Quantity
            </label>
            <Input
              type="number"
              required
              value={rentalForm.stock_quantity}
              onChange={e => setRentalForm({ ...rentalForm, stock_quantity: Number(e.target.value) })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setRentalDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="gold">
              Save Equipment
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default MenuManagement;
