// Classe pour gérer les fonctionnalités avancées de l'API (filtrage, tri, pagination, etc.)
class APIFeatures {
  constructor(query, queryString) {
    this.query = query;           // La requête Mongoose
    this.queryString = queryString; // Les paramètres de requête de l'URL
  }

  // -------------------- FILTRAGE -------------------- //
  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete queryObj[el]);

    // Filtrage avancé (gte, gt, lte, lt)
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  // -------------------- TRI -------------------- //
  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt'); // Tri par défaut par date de création décroissante
    }
    return this;
  }

  // -------------------- SÉLECTION DE CHAMPS -------------------- //
  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v'); // Exclure le champ __v par défaut
    }
    return this;
  }

  // -------------------- PAGINATION -------------------- //
  paginate() {
    const page = parseInt(this.queryString.page, 10) || 1;
    const limit = parseInt(this.queryString.limit, 10) || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);
    return this;
  }
}

// Export de la classe en ES Modules
export default APIFeatures;
