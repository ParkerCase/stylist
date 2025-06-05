import ItemCard from '@/components/ItemCard';

  return (
    <div className="closet-grid" data-cy="closet-grid">
      {closetItems.map(item => (
        <ItemCard
          key={item.id}
          item={item}
          onRemove={() => onRemove(item)}
          onFavorite={onFavorite}
          data-cy="closet-item-card"
        />
      ))}
    </div>
  ); 